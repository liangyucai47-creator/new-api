import React from 'react';
import { Button, Card, Empty, Typography } from '@douyinfe/semi-ui';
import { MessageSquarePlus } from 'lucide-react';

const ConversationSidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  isBusy,
  t,
}) => {
  return (
    <Card
      bordered={false}
      className='h-full'
      bodyStyle={{
        padding: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className='flex items-center justify-between gap-3 border-b border-semi-color-border px-4 py-4'>
        <div>
          <Typography.Title heading={6} className='!mb-0'>
            {t('会话')}
          </Typography.Title>
          <Typography.Text className='text-sm text-semi-color-text-2'>
            {t('本地保存的聊天记录')}
          </Typography.Text>
        </div>
        <Button
          icon={<MessageSquarePlus size={16} />}
          theme='solid'
          type='primary'
          onClick={onCreateConversation}
          disabled={isBusy}
        >
          {t('新建')}
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto px-3 py-3'>
        {conversations.length === 0 ? (
          <Empty
            image={Empty.SIMPLE}
            title={t('暂无会话')}
            description={t('创建一个新会话开始聊天')}
          />
        ) : (
          <div className='space-y-2'>
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <button
                  key={conversation.id}
                  type='button'
                  onClick={() => onSelectConversation(conversation.id)}
                  disabled={isBusy && !isActive}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-semi-color-border bg-semi-color-bg-0 hover:border-blue-300 hover:bg-semi-color-fill-0'
                  } ${isBusy && !isActive ? 'opacity-60' : ''}`}
                >
                  <div className='flex items-center justify-between gap-2'>
                    <Typography.Text strong ellipsis={{ showTooltip: true }}>
                      {conversation.title}
                    </Typography.Text>
                    <span className='rounded-full bg-semi-color-fill-0 px-2 py-0.5 text-[11px] text-semi-color-text-2'>
                      {conversation.model || t('未设置模型')}
                    </span>
                  </div>
                  <Typography.Paragraph
                    className='!mb-0 !mt-2 text-sm !text-semi-color-text-2'
                    ellipsis={{ rows: 2, showTooltip: true }}
                  >
                    {conversation.preview || t('还没有消息')}
                  </Typography.Paragraph>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ConversationSidebar;
