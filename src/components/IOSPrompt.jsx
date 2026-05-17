const IOSPrompt = ({ onDismiss, t }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
    <p className="font-semibold text-blue-900 text-sm">{t('customer.orderStatus.getNotifications')}</p>
    <p className="text-sm text-blue-700">{t('customer.orderStatus.addToHomeScreen')}</p>
    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
      <li>{t('customer.orderStatus.tapShare')}</li>
      <li>{t('customer.orderStatus.selectAddToHome')}</li>
      <li>{t('customer.orderStatus.openFromHome')}</li>
    </ol>
    <button onClick={onDismiss} className="text-xs text-blue-500 underline">{t('customer.orderStatus.dismiss')}</button>
  </div>
);

export default IOSPrompt;
