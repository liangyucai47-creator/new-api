import React from 'react';
import { useTranslation } from 'react-i18next';

const InternalChat = () => {
  const { t } = useTranslation();

  return (
    <div className='mt-[60px] px-3 md:px-4'>
      <div className='rounded-2xl border border-semi-color-border bg-semi-color-bg-0 px-5 py-6 shadow-sm'>
        <h1 className='text-xl font-semibold text-semi-color-text-0'>
          {t('内部聊天')}
        </h1>
        <p className='mt-2 text-sm text-semi-color-text-2'>loading...</p>
      </div>
    </div>
  );
};

export default InternalChat;
