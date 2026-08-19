package com.cadence.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import com.cadence.app.R

/** Illustrated avatar marks -- mirrors apps/web/src/components/marks.tsx's
 * MARKS (free) and PRO_MARKS (Plus-gated) exactly, including the camelCase
 * keys, since the stored `avatar` string is shared cross-client (a user who
 * picks an avatar on web sees the same one on Android and vice versa). */
val MARK_OPTIONS: List<Pair<String, Int>> = listOf(
    "signpost" to R.drawable.mark_signpost,
    "folder" to R.drawable.mark_folder,
    "profileMan" to R.drawable.mark_profile_man,
    "cat" to R.drawable.mark_cat,
    "pinkHair" to R.drawable.mark_pink_hair,
    "beanie" to R.drawable.mark_beanie,
    "dog" to R.drawable.mark_dog,
)

val PRO_MARK_OPTIONS: List<Pair<String, Int>> = listOf(
    "headphones" to R.drawable.mark_pro_headphones,
    "curlyHeadphones" to R.drawable.mark_pro_curly_headphones,
    "sleepyCat" to R.drawable.mark_pro_sleepy_cat,
    "silverHairGlasses" to R.drawable.mark_pro_silver_hair_glasses,
    "pinkHairThinking" to R.drawable.mark_pro_pink_hair_thinking,
    "greenHeadband" to R.drawable.mark_pro_green_headband,
    "robotAstronaut" to R.drawable.mark_pro_robot_astronaut,
    "headphonesCoffee" to R.drawable.mark_pro_headphones_coffee,
    "beanieReader" to R.drawable.mark_pro_beanie_reader,
    "dinoSunglasses" to R.drawable.mark_pro_dino_sunglasses,
    "redCap" to R.drawable.mark_pro_red_cap,
    "duckCap" to R.drawable.mark_pro_duck_cap,
    "curlyDarkSkin" to R.drawable.mark_pro_curly_dark_skin,
    "shibaInu" to R.drawable.mark_pro_shiba_inu,
    "bobaTea" to R.drawable.mark_pro_boba_tea,
    "astronautPeace" to R.drawable.mark_pro_astronaut_peace,
    "frogNotepad" to R.drawable.mark_pro_frog_notepad,
    "coderGlasses" to R.drawable.mark_pro_coder_glasses,
    "ghostBlueCap" to R.drawable.mark_pro_ghost_blue_cap,
    "frogCrown" to R.drawable.mark_pro_frog_crown,
    "wizardWriting" to R.drawable.mark_pro_wizard_writing,
    "wizardWand" to R.drawable.mark_pro_wizard_wand,
    "beretBlonde" to R.drawable.mark_pro_beret_blonde,
    "dinoCostumeKid" to R.drawable.mark_pro_dino_costume_kid,
    "roundRobot" to R.drawable.mark_pro_round_robot,
)

private val ALL_MARKS: Map<String, Int> = (MARK_OPTIONS + PRO_MARK_OPTIONS).toMap()

/** Resolves a *stored* avatar key (from either set, any plan) to its
 * drawable -- falls back to the "cat" mark, matching the backend's own
 * `avatar` column default (see backend/app/models.py). */
fun markDrawableFor(key: String?): Int = ALL_MARKS[key] ?: R.drawable.mark_cat

@Composable
fun MarkAvatar(key: String?, size: Dp, modifier: Modifier = Modifier) {
    Image(
        painter = painterResource(markDrawableFor(key)),
        contentDescription = null,
        modifier = modifier.size(size).clip(CircleShape),
    )
}
