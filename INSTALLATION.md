# MinakamiApp Production APK - Installatie Instructies

## 📱 App Informatie
- **App Naam**: MinakamiApp
- **Versie**: 1.0.0
- **Build Datum**: 1 oktober 2024
- **Bestandsformaten**: APK (68MB) en AAB (28MB)
- **Package**: com.minakamiappfinal

## 🚀 Installatie Opties

### Optie 1: Direct APK Installatie (Makkelijkst)
1. Download `MinakamiApp-PRODUCTION-v1.0.0.apk`
2. Zet het bestand over naar je Android telefoon
3. Ga naar Instellingen → Beveiliging → Schakel "Onbekende bronnen" in
4. Tik op het APK bestand om te installeren
5. Volg de installatie wizard

### Optie 2: Via ADB (Voor ontwikkelaars)
```bash
# Verbind je telefoon via USB met debugging aan
adb install MinakamiApp-PRODUCTION-v1.0.0.apk
```

### Optie 3: Google Play Store (Toekomstig)
De AAB bundle (`MinakamiApp-PRODUCTION-v1.0.0.aab`) is klaar voor upload naar Google Play Console

## 🔧 Features in deze Productie Build

✅ **Volledige functionaliteit**:
- Health tracking met Samsung Health integratie
- Strava workout synchronisatie
- Lokale SQLite database met encryptie
- Daily summaries met AI narrative generation
- Activity tracking (stappen, workouts, locaties)
- Call log analyse
- App usage monitoring
- Comprehensive trends & analytics

✅ **Productie optimalisaties**:
- Code obfuscation met ProGuard
- Resource shrinking
- Debug logging verwijderd
- Performance optimalisaties
- Security hardening

✅ **Compatibiliteit**:
- Android API level 21+ (Android 5.0+)
- Optimized for modern Android versions
- Multi-architecture support (arm64-v8a, armeabi-v7a, x86, x86_64)

## 🔐 Beveiliging

- **Encryptie**: Alle gevoelige data wordt lokaal versleuteld opgeslagen
- **Privacy**: Geen data verstuurd naar externe servers zonder toestemming
- **Permissies**: Alleen noodzakelijke permissies voor health tracking

## 🛠️ Technische Specificaties

### APK Details:
- **Bestandsgrootte**: 68MB
- **Architectures**: armeabi-v7a, arm64-v8a, x86, x86_64
- **Minimale Android versie**: 5.0 (API 21)
- **Getekend met**: Productie keystore
- **ProGuard**: Ingeschakeld voor code obfuscation

### AAB Details:
- **Bestandsgrootte**: 28MB (geoptimaliseerd voor Play Store)
- **Upload klaar**: Ja, direct te uploaden naar Play Console
- **App Bundle format**: Android's nieuwe distributie format

## 🧪 Test Instructies

1. **Eerste start**: App zal om permissies vragen voor health data
2. **Samsung Health**: Optionele integratie voor geavanceerde health metrics
3. **Strava**: Connect via OAuth voor workout synchronisatie
4. **Database**: Lokale opslag met automatische backups

## 🔍 Troubleshooting

### Installatie lukt niet?
- Zorg dat "Installeren van onbekende bronnen" is ingeschakeld
- Controleer of je voldoende opslagruimte hebt (minimaal 200MB vrij)
- Probeer de app te installeren via ADB voor gedetailleerde foutmeldingen

### App crasht bij opstarten?
- Controleer of alle permissies zijn verleend
- Samsung Health app moet geïnstalleerd zijn voor health features
- Zorg dat je een stabiele internet verbinding hebt bij eerste start

### Data sync werkt niet?
- Strava OAuth moet correct geconfigureerd zijn
- Controleer internet verbinding
- Zie logs in Android Studio voor debugging

## 📞 Support

Voor technische support of bug reports:
- Check de logs via `adb logcat | grep MinakamiApp`
- Exporteer app data via Settings → Export Data
- Neem contact op met de development team

## 📋 Build Informatie

**Build omgeving**:
- React Native: 0.72.x
- Gradle: 8.0.1
- Android SDK: 34
- Build tools: 34.0.0
- Keystore: Production (valid tot 2054)

**Optimalisaties toegepast**:
- ✅ ProGuard code obfuscation
- ✅ Resource shrinking
- ✅ Debug logging disabled
- ✅ Production signing
- ✅ Multi-architecture support
- ✅ Performance optimizations

---

**⚡ Ready for production use!**