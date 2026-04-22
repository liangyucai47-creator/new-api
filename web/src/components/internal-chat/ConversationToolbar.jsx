import React from 'react';
import { Select, Typography } from '@douyinfe/semi-ui';

const ConversationToolbar = ({ models, value, onChange, disabled, t }) => {
  return (
    <div className='flex items-center gap-3'>
      <div className='hidden sm:flex flex-col text-right'>
        <Typography.Text className='text-xs uppercase tracking-wide text-white/70'>
          {t('模型')}
        </Typography.Text>
        <Typography.Text className='text-xs text-white/80'>
          {t('当前会话独立切换')}
        </Typography.Text>
      </div>
      <Select
        size='small'
        value={value || undefined}
        onChange={onChange}
        disabled={disabled || models.length === 0}
        optionList={models.map((model) => ({
          label: model,
          value: model,
        }))}
        placeholder={t('选择模型')}
        className='min-w-[180px]'
      />
    </div>
  );
};

export default ConversationToolbar;
