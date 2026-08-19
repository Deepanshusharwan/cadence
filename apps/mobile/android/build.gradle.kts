plugins {
    // No separate `kotlin.android` plugin -- since AGP 9.0, Kotlin support
    // is built into the Android Gradle Plugin itself (applying the old
    // plugin is now a hard error, not just redundant). See
    // https://kotl.in/gradle/agp-built-in-kotlin.
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
