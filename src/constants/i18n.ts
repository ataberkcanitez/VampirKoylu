export const TR = {
    home: {
        createGame: "Oyun Oluştur",
        joinGame: "Oyuna Katıl",
    },
    create: {
        vampireCount: "Vampir Sayısı",
        villagerCount: "Köylü Sayısı",
        doctorRole: "Doktor Olsun mu?",
        startGame: "Oyunu Oluştur",
    },
    join: {
        gameId: "Oyun ID",
        displayName: "Görüntülenecek İsim",
        join: "Katıl",
    },
    lobby: {
        waitingPlayers: "Oyuncular Bekleniyor...",
        startNow: "Oyunu Başlat",
        playerList: "Oyuncular",
    },
    game: {
        roleDistribution: "Roller Dağıtılacak...",
        yourRole: "Senin Rolün:",
        vampire: "Vampir",
        villager: "Köylü",
        doctor: "Doktor",
        gong: "GONG",
        vibrate: "TİTREŞİM",
        night: "Gece",
        day: "Gündüz",
        gameEnded: "Oyun Bitti",
        showRole: "Rolü Göster",
        hideRole: "Gizle",
        vampireVoting: "Vampirler Kimi Öldürecek?",
        doctorSaving: "Doktor Kimi Kurtaracak?",
        morningNews: "Gece Sonu Raporu",
        playerDied: "{name} öldürüldü.",
        noOneDied: "Kimse ölmedi.",
        startNightConfirm: "Geceyi Başlat",
        vampiresWin: "VAMPİRLER KAZANDI!",
        villagersWin: "KÖYLÜLER KAZANDI!",
        dailyVoting: "Gündüz Oylaması",
        startDailyVote: "Gündüz Oylamasını Başlat",
        voteToKill: "Kimi asıyoruz?",
        voted: "Oy Verildi",
    },
    errors: {
        gameNotFound: "Oyun bulunamadı!",
        invalidId: "Geçersiz Oyun ID",
        nameRequired: "İsim girmelisiniz",
    }
};

export const EN = {
    home: {
        createGame: "Create Game",
        joinGame: "Join Game",
    },
    create: {
        vampireCount: "Vampire Count",
        villagerCount: "Villager Count",
        doctorRole: "Include Doctor?",
        startGame: "Create Game",
    },
    join: {
        gameId: "Game ID",
        displayName: "Display Name",
        join: "Join",
    },
    lobby: {
        waitingPlayers: "Waiting for players...",
        startNow: "Start Game",
        playerList: "Players",
    },
    game: {
        roleDistribution: "Distributing roles...",
        yourRole: "Your Role:",
        vampire: "Vampire",
        villager: "Villager",
        doctor: "Doctor",
        gong: "GONG",
        vibrate: "VIBRATE",
        night: "Night",
        day: "Day",
        gameEnded: "Game Ended",
        showRole: "Show Role",
        hideRole: "Hide",
        vampireVoting: "Who will Vampires kill?",
        doctorSaving: "Who will Doctor save?",
        morningNews: "Night Report",
        playerDied: "{name} was killed.",
        noOneDied: "No one died.",
        startNightConfirm: "Start Night",
        vampiresWin: "VAMPIRES WIN!",
        villagersWin: "VILLAGERS WIN!",
        dailyVoting: "Daily Voting",
        startDailyVote: "Start Daily Vote",
        voteToKill: "Who shall we hang?",
        voted: "Voted",
    },
    errors: {
        gameNotFound: "Game not found!",
        invalidId: "Invalid Game ID",
        nameRequired: "Name is required",
    }
};

const i18n = {
    tr: TR,
    en: EN,
};

export default i18n;
