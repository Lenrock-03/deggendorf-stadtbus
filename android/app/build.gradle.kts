plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "de.kornelriedl.deggendorfstadtbus"
    compileSdk = 34

    defaultConfig {
        applicationId = "de.kornelriedl.deggendorfstadtbus"
        minSdk = 26
        targetSdk = 34
        versionCode = 3
        versionName = "1.0.3"
    }

    buildFeatures {
        compose = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Compose / Material 3
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.0")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // osmdroid für die Kartenansicht (gleiche OSM-Kacheln wie die Web-App, kein API-Key nötig)
    implementation("org.osmdroid:osmdroid-android:6.1.18")

    // Für "Standort verwenden" (einmalige Standortabfrage, kein Hintergrund-Tracking)
    implementation("com.google.android.gms:play-services-location:21.3.0")
}
