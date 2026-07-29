// Shared SVG icons for network pages
// Each path is on its own line to avoid Turbopack source-map column overflow

function Ico({ d, size = "w-4 h-4", fill = "none", sw = 2, filled = false }) {
  return (
    <svg className={size} fill={filled ? "currentColor" : fill} stroke={filled ? "none" : "currentColor"} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={filled ? undefined : sw} d={d} />
    </svg>
  );
}

const D = {
  feed:
    "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6-4h6",
  myPosts:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  network:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  messages:
    "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  discover:
    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  like:
    "M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5",
  comment:
    "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
  share:
    "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
  send:
    "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  back:
    "M15 19l-7-7 7-7",
  close:
    "M6 18L18 6M6 6l12 12",
  trash:
    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  connect:
    "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  message:
    "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  check:
    "M5 13l4 4L19 7",
  block:
    "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  newChat:
    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  read:
    "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z",
  groups:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  crown:
    "M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 000 2h10a1 1 0 000-2H7z",
  edit:
    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  leave:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  addUser:
    "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  info:
    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

export const Icons = {
  feed:      () => <Ico d={D.feed} />,
  myPosts:   () => <Ico d={D.myPosts} />,
  network:   () => <Ico d={D.network} />,
  messages:  () => <Ico d={D.messages} />,
  discover:  () => <Ico d={D.discover} />,
  like:      () => <Ico d={D.like} size="w-5 h-5" />,
  likedFill: () => <Ico d={D.like} size="w-5 h-5" filled />,
  comment:   () => <Ico d={D.comment} size="w-5 h-5" />,
  share:     () => <Ico d={D.share} size="w-5 h-5" />,
  send:      () => <Ico d={D.send} />,
  back:      () => <Ico d={D.back} size="w-5 h-5" />,
  close:     () => <Ico d={D.close} size="w-5 h-5" />,
  trash:     () => <Ico d={D.trash} />,
  connect:   () => <Ico d={D.connect} />,
  message:   () => <Ico d={D.message} />,
  check:     () => <Ico d={D.check} />,
  block:     () => <Ico d={D.block} />,
  newChat:   () => <Ico d={D.newChat} />,
  read:      () => <Ico d={D.read} size="w-3 h-3" filled />,
  groups:    () => <Ico d={D.groups} />,
  crown:     () => <Ico d={D.crown} size="w-3 h-3" filled />,
  edit:      () => <Ico d={D.edit} />,
  leave:     () => <Ico d={D.leave} />,
  addUser:   () => <Ico d={D.addUser} />,
  info:      () => <Ico d={D.info} />,
};
