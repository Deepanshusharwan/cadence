import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// Clerk publishable key + backend URL: read from local.properties (not
// committed -- see .gitignore) so a real key never lands in git, same
// spirit as backend/.env / apps/web/.env.local. A clean checkout without
// local.properties still compiles (falls back to a placeholder key, so
// auth simply won't authenticate until it's set) -- see README.md.
val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun localProp(key: String, default: String): String =
    (localProperties.getProperty(key) ?: System.getenv(key))?.takeIf { it.isNotBlank() } ?: default

android {
    namespace = "com.cadence.app"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "com.cadence.app"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.targetSdk.get().toInt()
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField(
            "String",
            "CLERK_PUBLISHABLE_KEY",
            "\"${localProp("CADENCE_CLERK_PUBLISHABLE_KEY", "pk_test_placeholder")}\"",
        )
    }

    buildTypes {
        debug {
            // 10.0.2.2 is the Android emulator's alias for the host machine's
            // localhost -- matches backend's default `uv run uvicorn --reload`
            // on :8000 (see backend/README.md). A physical device needs this
            // overridden in local.properties (CADENCE_API_BASE_URL) to the
            // host's real LAN address.
            buildConfigField(
                "String",
                "API_BASE_URL",
                "\"${localProp("CADENCE_API_BASE_URL", "http://10.0.2.2:8000/")}\"",
            )
        }
        release {
            isMinifyEnabled = false
            buildConfigField(
                "String",
                "API_BASE_URL",
                "\"${localProp("CADENCE_API_BASE_URL", "https://api.example.com/")}\"",
            )
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // minSdk 24 is below API 26, where java.time landed natively --
        // desugaring lets the weekly-progress date math (data/WeekMath.kt)
        // use java.time.LocalDate on every supported device anyway.
        isCoreLibraryDesugaringEnabled = true
    }

    kotlin {
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.activity.compose)
    implementation(libs.lifecycle.runtime.ktx)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.navigation.compose)
    implementation(libs.datastore.preferences)
    implementation(libs.work.runtime.ktx)

    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.clerk.android.api)
    implementation(libs.clerk.android.ui)

    coreLibraryDesugaring(libs.desugar.jdk.libs)

    testImplementation(libs.junit)
}
