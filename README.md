# Vampir Köylü 🐺🏘️

Vampir Köylü, popüler sosyal çıkarım oyununu (Vampir/Köylü, Kurt Adam, Mafia) dijital ortama taşıyan, React Native ve Expo ile geliştirilmiş mobil bir uygulamadır. Arkadaşlarınızla fiziksel olarak bir aradayken oyunun yönetimini kolaylaştırmak ve tüm oylama/rol süreçlerini otomatize etmek için tasarlanmıştır.

## ✨ Özellikler

- **Tam Otomatik Gece Döngüsü**: Vampirlerin avlanması ve Doktorun kurtarma seansları.
- **Gündüz Oylaması**: Şüphelileri belirlemek ve asmak için herkesin katıldığı açık oylama.
- **Hassas Rol Gizliliği**: Roller varsayılan olarak gizlidir ve sadece oyuncu istediğinde (göz ikonu ile) görüntülenebilir.
- **Gong Sistemi**: Oyun yöneticisi (Admin) için sesli ve titreşimli uyarılar.
- **Canlı Durum Takibi**: Kimin hayatta olduğunu, kimin öldüğünü anlık olarak takip edin.
- **Kazanma Koşulları**: Vampirlerin veya köylülerin zaferi otomatik olarak hesaplanır ve duyurulur.

## 🎮 Nasıl Oynanır?

1. **Oda Kur**: Bir oyuncu "Oyun Kur" butonuna basarak yeni bir oyun oluşturur ve verilen 6 haneli kodu arkadaşlarıyla paylaşır.
2. **Katıl**: Diğer oyuncular "Oyuna Katıl" butonuna basarak kodu ve isimlerini girer.
3. **Rol Dağılımı**: Yönetici (Admin), oyunu başlattığında roller otomatik olarak dağıtılır.
4. **Döngü**: 
   - Admin "Gong" çalarak geceyi başlatır.
   - Vampirler kurban seçer, Doktor birini kurtarmaya çalışır.
   - Sabah olduğunda ölen kişi duyurulur ve tartışma başlar.
   - Gündüz oylamasıyla bir kişi elenir.
5. **Son**: Vampirler köylü sayısına eşitlenirse vampirler, tüm vampirler elenirse köylüler kazanır!

## 🛠️ Teknolojiler

- [Expo](https://expo.dev/) & [React Native](https://reactnative.dev/)
- [Firebase Firestore](https://firebase.google.com/docs/firestore) (Gerçek zamanlı veritabanı)
- [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/) (Gong sesleri)
- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) (Titreşimler)

---

Keyifli oyunlar! 🐺🗡️🏘️
