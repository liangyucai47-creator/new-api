/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import { Card, Chat, Typography, Button } from '@douyinfe/semi-ui';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CustomInputRender from './CustomInputRender';

const ChatArea = ({
  chatRef,
  message,
  inputs,
  styleState,
  showDebugPanel,
  roleInfo,
  headerActions,
  title,
  subtitle,
  placeholder,
  uploadProps,
  showDebugToggle = true,
  onMessageSend,
  onMessageCopy,
  onMessageReset,
  onMessageDelete,
  onStopGenerator,
  onClearMessages,
  onToggleDebugPanel,
  renderCustomChatContent,
  renderChatBoxAction,
}) => {
  const { t } = useTranslation();

  const renderInputArea = React.useCallback((props) => {
    return <CustomInputRender {...props} />;
  }, []);

  const resolvedTitle = title || t('AI 对话');
  const resolvedSubtitle =
    subtitle || inputs.model || t('选择模型开始对话');

  return (
    <Card
      className='h-full'
      bordered={false}
      bodyStyle={{
        padding: 0,
        height: 'calc(100vh - 66px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {styleState.isMobile ? (
        <div className='border-b border-semi-color-border bg-semi-color-bg-0 px-4 py-3'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <Typography.Title heading={6} className='!mb-0'>
                {resolvedTitle}
              </Typography.Title>
              <Typography.Text className='text-sm text-semi-color-text-2'>
                {resolvedSubtitle}
              </Typography.Text>
            </div>
            <div className='flex items-center gap-2'>
              {headerActions}
              {showDebugToggle ? (
                <Button
                  icon={showDebugPanel ? <EyeOff size={14} /> : <Eye size={14} />}
                  onClick={onToggleDebugPanel}
                  theme='borderless'
                  type='tertiary'
                  size='small'
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className='rounded-t-2xl bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur'>
                <MessageSquare size={20} className='text-white' />
              </div>
              <div>
                <Typography.Title heading={5} className='!mb-0 !text-white'>
                  {resolvedTitle}
                </Typography.Title>
                <Typography.Text className='hidden text-sm !text-white/80 sm:inline'>
                  {resolvedSubtitle}
                </Typography.Text>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {headerActions}
              {showDebugToggle ? (
                <Button
                  icon={showDebugPanel ? <EyeOff size={14} /> : <Eye size={14} />}
                  onClick={onToggleDebugPanel}
                  theme='borderless'
                  type='primary'
                  size='small'
                  className='!rounded-lg !text-white/80 hover:!bg-white/10 hover:!text-white'
                >
                  {showDebugPanel ? t('隐藏调试') : t('显示调试')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className='flex-1 overflow-hidden'>
        <Chat
          ref={chatRef}
          chatBoxRenderConfig={{
            renderChatBoxContent: renderCustomChatContent,
            renderChatBoxAction: renderChatBoxAction,
            renderChatBoxTitle: () => null,
          }}
          renderInputArea={renderInputArea}
          roleConfig={roleInfo}
          style={{
            height: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
          }}
          chats={message}
          onMessageSend={onMessageSend}
          onMessageCopy={onMessageCopy}
          onMessageReset={onMessageReset}
          onMessageDelete={onMessageDelete}
          showClearContext
          showStopGenerate
          uploadProps={uploadProps}
          onStopGenerator={onStopGenerator}
          onClear={onClearMessages}
          className='h-full'
          placeholder={placeholder || t('请输入您的问题...')}
        />
      </div>
    </Card>
  );
};

export default ChatArea;
