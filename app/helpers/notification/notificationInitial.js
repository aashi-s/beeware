export const removeBadgeCount = async () => {
  await setBadgeCount(0);
  await cancelAllNotifications();
  console.log("Badge count removed");
};

export const addBadgeCount = async (count = 1) => {
  setBadgeCount(count);
  console.log(`Badge count set to ${count}`);
};

export const displayNotification = async (title, body, categoryId, data) => {
  const channelId = await createChennel({
    id: "default",
    name: "Default Channel",
  });
  displayNotification({
    title,
    body,
    data,
    android: {
      channelId,
      onlyAlertOnce: true,
      smallIcon: "logo.png",
      pressAction: { id: "default" },
    },
    ios: {
      categoryId,
      foregeoundPresentationOptions: {
        badge: true,
        sound: true,
        banner: true,
        list: true,
      },
    },
  });
};
