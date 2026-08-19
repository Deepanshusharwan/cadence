package com.cadence.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Ports apps/web/src/app/globals.css's `@theme` block 1:1 -- same names,
 * same hex values, light + dark variants -- so the native apps and the
 * website stay visually identical rather than each drifting into their own
 * "close enough" palette. See docs/architecture.md's design notes and the
 * notion-web-design skill for the reference this was built from.
 */
object CadenceColors {
    // Chromatic tokens -- identical in light and dark (already saturated
    // enough to read on either ground, per globals.css's own comment).
    val notionBlue = Color(0xFF0075DE)
    val marigold = Color(0xFFFFB110)
    val coral = Color(0xFFF64932)
    val saffron = Color(0xFFE89D01)
    val vermillion = Color(0xFFE32D14)
    val mocha = Color(0xFFB18164)
    val signalBlue = Color(0xFF097FE8)
    val skyWash = Color(0xFF62AEF0)
    val midnightInk = Color(0xFF02093A)
    val peach = Color(0xFFF6D5B8)
    val terracotta = Color(0xFFD9785A)
    val orchid = Color(0xFFA98FD1)
    val denim = Color(0xFF6F9DC4)

    // Neutral/surface tokens -- these flip between light.kt/dark.kt below.
    object Light {
        val paperWarmth = Color(0xFFF6F5F4)
        val pureWhite = Color(0xFFFFFFFF)
        val inkBlack = Color(0xFF000000)
        val charcoal = Color(0xFF111111)
        val stone = Color(0xFF757575)
        val graphite = Color(0xFF615D59)
        val slate = Color(0xFF696969)
        val skyTint = Color(0xFFE6F3FE)
        val hairline = Color(0x14000000) // rgba(0,0,0,0.08)
    }

    object Dark {
        val paperWarmth = Color(0xFF181613)
        val pureWhite = Color(0xFF232120)
        val inkBlack = Color(0xFFF3F0EA)
        val charcoal = Color(0xFFE8E3DA)
        val stone = Color(0xFF9A9690)
        val graphite = Color(0xFFBFB9B0)
        val slate = Color(0xFFA39D96)
        val skyTint = Color(0xFF17293C)
        val hairline = Color(0x1FFFFFFF)
    }
}

/** The subset of tokens a screen actually reaches for by name (mirrors
 * Tailwind utility usage like `text-ink-black/60` on the web) -- exposed
 * via [LocalCadenceColors] so components read `CadenceTheme.colors.stone`
 * instead of juggling Material3's generic on-surface/on-background roles,
 * which don't map cleanly onto this palette's specific named hues. */
data class CadenceColorTokens(
    val paperWarmth: Color,
    val pureWhite: Color,
    val inkBlack: Color,
    val charcoal: Color,
    val stone: Color,
    val graphite: Color,
    val slate: Color,
    val skyTint: Color,
    val hairline: Color,
    val notionBlue: Color = CadenceColors.notionBlue,
    val marigold: Color = CadenceColors.marigold,
    val coral: Color = CadenceColors.coral,
    val saffron: Color = CadenceColors.saffron,
    val vermillion: Color = CadenceColors.vermillion,
    val mocha: Color = CadenceColors.mocha,
    val signalBlue: Color = CadenceColors.signalBlue,
    val skyWash: Color = CadenceColors.skyWash,
    val midnightInk: Color = CadenceColors.midnightInk,
    val accent: Color = CadenceColors.notionBlue,
)

val LightCadenceColorTokens = CadenceColorTokens(
    paperWarmth = CadenceColors.Light.paperWarmth,
    pureWhite = CadenceColors.Light.pureWhite,
    inkBlack = CadenceColors.Light.inkBlack,
    charcoal = CadenceColors.Light.charcoal,
    stone = CadenceColors.Light.stone,
    graphite = CadenceColors.Light.graphite,
    slate = CadenceColors.Light.slate,
    skyTint = CadenceColors.Light.skyTint,
    hairline = CadenceColors.Light.hairline,
)

val DarkCadenceColorTokens = CadenceColorTokens(
    paperWarmth = CadenceColors.Dark.paperWarmth,
    pureWhite = CadenceColors.Dark.pureWhite,
    inkBlack = CadenceColors.Dark.inkBlack,
    charcoal = CadenceColors.Dark.charcoal,
    stone = CadenceColors.Dark.stone,
    graphite = CadenceColors.Dark.graphite,
    slate = CadenceColors.Dark.slate,
    skyTint = CadenceColors.Dark.skyTint,
    hairline = CadenceColors.Dark.hairline,
)
