import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Layout, Toast } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { PlaygroundProvider } from '../../contexts/PlaygroundContext';
import { UserContext } from '../../context/User';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useApiRequest } from '../../hooks/playground/useApiRequest';
import { OptimizedMessageContent } from '../../components/playground/OptimizedComponents';
import ChatArea from '../../components/playground/ChatArea';
import ConversationSidebar from '../../components/internal-chat/ConversationSidebar';
import ConversationToolbar from '../../components/internal-chat/ConversationToolbar';
import {
  API,
  buildApiPayload,
  buildMessageContent,
  copy,
  createLoadingAssistantMessage,
  createMessage,
  encodeToBase64,
  getLogo,
  getTextContent,
  stringToColor,
} from '../../helpers';
import {
  MESSAGE_ROLES,
  MESSAGE_STATUS,
} from '../../constants/playground.constants';
import {
  buildConversationPreview,
  resolveDefaultChatContext,
} from '../../helpers/internalChat';
import {
  loadActiveConversationId,
  loadConversationIndex,
  loadConversationMessages,
  saveActiveConversationId,
  saveConversationIndex,
  saveConversationMessages,
} from '../../helpers/internalChatStorage';

const DEFAULT_PARAMETER_ENABLED = {
  temperature: true,
  top_p: true,
  max_tokens: false,
  frequency_penalty: true,
  presence_penalty: true,
  seed: false,
};

const trimText = (value, maxLength) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

const generateAvatarDataUrl = (username) => {
  if (!username) {
    return getLogo();
  }
  const firstLetter = username[0].toUpperCase();
  const bgColor = stringToColor(username);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="${bgColor}" />
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="16" fill="#ffffff" font-family="sans-serif">${firstLetter}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${encodeToBase64(svg)}`;
};

const createConversationId = () =>
  `internal-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createConversationRecord = ({ model, resolvedTokenId, title }) => {
  const now = Date.now();
  return {
    id: createConversationId(),
    title,
    preview: '',
    model: model || '',
    resolvedTokenId: resolvedTokenId ?? null,
    createdAt: now,
    updatedAt: now,
  };
};

const sortConversations = (conversations) =>
  [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);

const InternalChat = () => {
  const { t } = useTranslation();
  const [userState] = useContext(UserContext);
  const isMobile = useIsMobile();
  const styleState = useMemo(() => ({ isMobile }), [isMobile]);

  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [resolvedModels, setResolvedModels] = useState([]);
  const [resolvedTokenId, setResolvedTokenId] = useState(null);
  const [pastedImages, setPastedImages] = useState([]);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [debugData, setDebugData] = useState({});
  const [activeDebugTab, setActiveDebugTab] = useState('preview');

  const chatRef = useRef(null);
  const sseSourceRef = useRef(null);
  const activeConversationIdRef = useRef(null);

  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ||
      null,
    [conversations, activeConversationId],
  );

  const isGenerating = useMemo(
    () =>
      messages.some(
        (message) =>
          message.status === MESSAGE_STATUS.LOADING ||
          message.status === MESSAGE_STATUS.INCOMPLETE,
      ),
    [messages],
  );

  const updateConversationFromMessages = useCallback(
    (conversationId, nextMessages, overrides = {}) => {
      if (!conversationId) {
        return;
      }

      const preview = trimText(buildConversationPreview(nextMessages), 120);

      setConversations((previousConversations) => {
        const nextConversations = sortConversations(
          previousConversations.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            const nextTitle =
              conversation.title && conversation.title !== t('新对话')
                ? conversation.title
                : trimText(preview || t('新对话'), 32);

            return {
              ...conversation,
              ...overrides,
              title: nextTitle,
              preview,
              updatedAt: Date.now(),
            };
          }),
        );
        saveConversationIndex(nextConversations);
        return nextConversations;
      });

      void saveConversationMessages(conversationId, nextMessages);
    },
    [t],
  );

  const { sendRequest, onStopGenerator } = useApiRequest(
    setMessages,
    setDebugData,
    setActiveDebugTab,
    sseSourceRef,
    updateConversationFromMessages,
  );

  const roleInfo = useMemo(
    () => ({
      user: {
        name: userState?.user?.username || 'User',
        avatar: generateAvatarDataUrl(userState?.user?.username),
      },
      assistant: {
        name: 'Assistant',
        avatar: getLogo(),
      },
      system: {
        name: 'System',
        avatar: getLogo(),
      },
    }),
    [userState?.user?.username],
  );

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [tokenResponse, modelResponse] = await Promise.all([
          API.get('/api/token/?p=0&size=20'),
          API.get('/api/user/models'),
        ]);

        const tokens = tokenResponse.data?.data?.items || [];
        const userModels = modelResponse.data?.data || [];
        const context = resolveDefaultChatContext({ tokens, userModels });

        if (cancelled) {
          return;
        }

        setResolvedTokenId(context.tokenId);
        setResolvedModels(context.models);

        const savedIndex = loadConversationIndex();
        const normalizedConversations = Array.isArray(savedIndex)
          ? savedIndex
              .map((conversation) => ({
                ...conversation,
                title: conversation.title || t('新对话'),
                preview: conversation.preview || '',
                model:
                  context.models.includes(conversation.model)
                    ? conversation.model
                    : context.defaultModel,
                resolvedTokenId:
                  conversation.resolvedTokenId ?? context.tokenId ?? null,
                createdAt: conversation.createdAt || Date.now(),
                updatedAt: conversation.updatedAt || Date.now(),
              }))
              .filter((conversation) => conversation.id)
          : [];

        const nextConversations =
          normalizedConversations.length > 0
            ? sortConversations(normalizedConversations)
            : [
                createConversationRecord({
                  model: context.defaultModel,
                  resolvedTokenId: context.tokenId,
                  title: t('新对话'),
                }),
              ];

        const storedActiveConversationId = loadActiveConversationId();
        const nextActiveConversationId = nextConversations.some(
          (conversation) => conversation.id === storedActiveConversationId,
        )
          ? storedActiveConversationId
          : nextConversations[0]?.id || null;

        setConversations(nextConversations);
        setActiveConversationId(nextActiveConversationId);
        saveConversationIndex(nextConversations);
      } catch (error) {
        Toast.error(t('初始化内部聊天失败'));
      } finally {
        if (!cancelled) {
          setLoadingBootstrap(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      if (!activeConversationId) {
        setMessages([]);
        return;
      }

      const nextMessages = await loadConversationMessages(activeConversationId);
      if (!cancelled) {
        setMessages(Array.isArray(nextMessages) ? nextMessages : []);
        setPastedImages([]);
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [activeConversationId]);

  const toggleReasoningExpansion = useCallback(
    (messageId) => {
      setMessages((previousMessages) => {
        const nextMessages = previousMessages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                isReasoningExpanded: !message.isReasoningExpanded,
              }
            : message,
        );
        updateConversationFromMessages(activeConversationIdRef.current, nextMessages);
        return nextMessages;
      });
    },
    [updateConversationFromMessages],
  );

  const renderCustomChatContent = useCallback(
    (props) => (
      <OptimizedMessageContent
        {...props}
        styleState={styleState}
        onToggleReasoningExpansion={toggleReasoningExpansion}
      />
    ),
    [styleState, toggleReasoningExpansion],
  );

  const handleCreateConversation = useCallback(() => {
    const newConversation = createConversationRecord({
      model: resolvedModels[0] || '',
      resolvedTokenId,
      title: t('新对话'),
    });

    setConversations((previousConversations) => {
      const nextConversations = sortConversations([
        newConversation,
        ...previousConversations,
      ]);
      saveConversationIndex(nextConversations);
      return nextConversations;
    });
    setActiveConversationId(newConversation.id);
    setMessages([]);
    setPastedImages([]);
    void saveConversationMessages(newConversation.id, []);
  }, [resolvedModels, resolvedTokenId, t]);

  const handleSelectConversation = useCallback(
    (conversationId) => {
      if (isGenerating && conversationId !== activeConversationIdRef.current) {
        return;
      }
      setActiveConversationId(conversationId);
    },
    [isGenerating],
  );

  const handleModelChange = useCallback((nextModel) => {
    if (!activeConversationIdRef.current) {
      return;
    }

    setConversations((previousConversations) => {
      const nextConversations = previousConversations.map((conversation) =>
        conversation.id === activeConversationIdRef.current
          ? {
              ...conversation,
              model: nextModel,
              updatedAt: Date.now(),
            }
          : conversation,
      );
      saveConversationIndex(nextConversations);
      return nextConversations;
    });
  }, []);

  const handleClearMessages = useCallback(() => {
    setMessages([]);
    setPastedImages([]);
    updateConversationFromMessages(activeConversationIdRef.current, []);
  }, [updateConversationFromMessages]);

  const handleMessageDelete = useCallback(
    (targetMessage) => {
      if (!targetMessage?.id) {
        return;
      }
      setMessages((previousMessages) => {
        const nextMessages = previousMessages.filter(
          (message) => message.id !== targetMessage.id,
        );
        updateConversationFromMessages(activeConversationIdRef.current, nextMessages);
        return nextMessages;
      });
    },
    [updateConversationFromMessages],
  );

  const handleMessageCopy = useCallback(
    async (targetMessage) => {
      const textContent = getTextContent(targetMessage);
      if (!textContent) {
        Toast.warning(t('没有可复制的文本内容'));
        return;
      }

      const copied = await copy(textContent);
      if (copied) {
        Toast.success(t('已复制消息'));
      } else {
        Toast.error(t('复制失败'));
      }
    },
    [t],
  );

  const convertFileToDataUrl = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }),
    [],
  );

  const uploadProps = useMemo(
    () => ({
      action: '#',
      accept: 'image/*',
      limit: 4,
      listType: 'picture',
      showUploadList: false,
      customRequest: async ({
        fileInstance,
        onSuccess,
        onError,
        onProgress,
      }) => {
        try {
          onProgress?.({ total: 100, loaded: 30 });
          const url = await convertFileToDataUrl(fileInstance);
          onProgress?.({ total: 100, loaded: 100 });
          onSuccess?.({ url });
        } catch (error) {
          onError?.({ status: 500 }, error);
        }
      },
      afterUpload: ({ response }) => ({
        url: response?.url,
      }),
    }),
    [convertFileToDataUrl],
  );

  const handlePasteImage = useCallback((base64Data) => {
    setPastedImages((previousImages) => [...previousImages, base64Data]);
  }, []);

  const handleMessageSend = useCallback(
    (content, attachment = []) => {
      if (!activeConversation) {
        return;
      }

      if (!activeConversation.model) {
        Toast.warning(t('当前没有可用模型'));
        return;
      }

      const attachmentUrls = attachment
        .map((item) => item?.url || item?.response?.url)
        .filter(Boolean);
      const imageUrls = [...pastedImages, ...attachmentUrls];
      const messageContent = buildMessageContent(
        content || '',
        imageUrls,
        imageUrls.length > 0,
      );

      if (!messageContent) {
        return;
      }

      const userMessage = createMessage(MESSAGE_ROLES.USER, messageContent);
      const loadingMessage = createLoadingAssistantMessage();
      const nextMessages = [...messages, userMessage, loadingMessage];
      const payload = buildApiPayload(
        nextMessages,
        null,
        {
          model: activeConversation.model,
          group: '',
          stream: true,
          temperature: 0.7,
          top_p: 1,
          max_tokens: 4096,
          frequency_penalty: 0,
          presence_penalty: 0,
          seed: null,
        },
        DEFAULT_PARAMETER_ENABLED,
      );

      if (activeConversation.resolvedTokenId) {
        payload.token_id = activeConversation.resolvedTokenId;
      }

      setMessages(nextMessages);
      setPastedImages([]);
      updateConversationFromMessages(activeConversation.id, nextMessages);
      sendRequest(payload, true);
    },
    [
      activeConversation,
      messages,
      pastedImages,
      sendRequest,
      t,
      updateConversationFromMessages,
    ],
  );

  const conversationToolbar = useMemo(
    () => (
      <ConversationToolbar
        models={resolvedModels}
        value={activeConversation?.model}
        onChange={handleModelChange}
        disabled={isGenerating}
        t={t}
      />
    ),
    [activeConversation?.model, handleModelChange, isGenerating, resolvedModels, t],
  );

  const playgroundContextValue = useMemo(
    () => ({
      onPasteImage: handlePasteImage,
      imageUrls: pastedImages,
      imageEnabled: true,
    }),
    [handlePasteImage, pastedImages],
  );

  return (
    <PlaygroundProvider value={playgroundContextValue}>
      <div className='mt-[60px] h-[calc(100vh-66px)] px-3 pb-3 md:px-4'>
        <Layout
          className={`h-full gap-3 bg-transparent ${
            isMobile ? 'flex-col' : 'flex-row'
          }`}
        >
          <Layout.Sider
            width={isMobile ? '100%' : 320}
            className={isMobile ? 'w-full !min-w-0' : '!bg-transparent'}
          >
            <ConversationSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onCreateConversation={handleCreateConversation}
              isBusy={isGenerating}
              t={t}
            />
          </Layout.Sider>

          <Layout.Content className='flex-1 overflow-hidden'>
            <ChatArea
              chatRef={chatRef}
              message={messages}
              inputs={{ model: activeConversation?.model || '', stream: true }}
              styleState={styleState}
              showDebugPanel={false}
              showDebugToggle={false}
              roleInfo={roleInfo}
              headerActions={conversationToolbar}
              title={t('内部聊天')}
              subtitle={
                activeConversation?.model
                  ? `${t('当前模型')}: ${activeConversation.model}`
                  : t('请选择模型开始对话')
              }
              uploadProps={uploadProps}
              placeholder={
                loadingBootstrap
                  ? t('正在加载内部聊天...')
                  : t('输入问题，开始新的内部会话')
              }
              onMessageSend={handleMessageSend}
              onMessageCopy={handleMessageCopy}
              onMessageReset={undefined}
              onMessageDelete={handleMessageDelete}
              onStopGenerator={onStopGenerator}
              onClearMessages={handleClearMessages}
              onToggleDebugPanel={() => {}}
              renderCustomChatContent={renderCustomChatContent}
              renderChatBoxAction={undefined}
            />
          </Layout.Content>
        </Layout>
      </div>
    </PlaygroundProvider>
  );
};

export default InternalChat;
