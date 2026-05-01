package ie.oireachtas.explorer.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import ie.oireachtas.explorer.R

// ── Colour Palette (mirrors src/App.css :root tokens) ────────────────────────

object OireachtasColors {
    // Surfaces & background — warm cream / parchment
    val Bg = Color(0xFFF5F2EB)            // --bg
    val Surface = Color(0xFFFFFFFF)       // --surface
    val SurfaceAlt = Color(0xFFF0EDE6)    // --surf2
    val Border = Color(0xFFDDD8CC)        // --border
    val BorderHover = Color(0xFFB8B098)   // --border-h

    // Green ramp (--g50 .. --g950)
    val Green950 = Color(0xFF06160A)
    val Green900 = Color(0xFF0C2B16)      // header background
    val Green800 = Color(0xFF133D20)
    val Green700 = Color(0xFF1A5228)      // primary accent
    val Green600 = Color(0xFF1F6530)
    val Green500 = Color(0xFF267A3A)
    val Green400 = Color(0xFF3A9E52)
    val Green100 = Color(0xFFD8F0DD)
    val Green50 = Color(0xFFEDF8EF)

    // Gold accents
    val Gold = Color(0xFFB8860B)
    val GoldLight = Color(0xFFFDF3D8)
    val GoldMid = Color(0xFFF5E8C0)

    // Text ramp (--text .. --text4)
    val Text = Color(0xFF1A180F)
    val Text2 = Color(0xFF3A3620)
    val Text3 = Color(0xFF6A6448)
    val Text4 = Color(0xFF9A9070)

    // Vote tally palette (--color-vote-*)
    val VoteFor = Color(0xFF1A7A30)
    val VoteAgainst = Color(0xFFC62828)
    val VoteAbstain = Color(0xFF5A6A78)
}

// ── Party Colours (mirrors src/utils/format.ts) ──────────────────────────────

object PartyColors {
    private val partyColorMap = linkedMapOf(
        "fianna" to Color(0xFF006633),
        "fine gael" to Color(0xFF004899),
        "sinn féin" to Color(0xFF326760),
        "sinn fein" to Color(0xFF326760),
        "labour" to Color(0xFFCC0000),
        "green" to Color(0xFF337738),
        "social democrat" to Color(0xFF752F8F),
        "aontú" to Color(0xFF007C4C),
        "aontu" to Color(0xFF007C4C),
        "people before profit" to Color(0xFFE63329),
        "solidarity" to Color(0xFFE63329),
        "right to change" to Color(0xFFF58220),
        "independent ireland" to Color(0xFF1A237E),
    )

    fun partyColor(partyName: String): Color {
        val name = partyName.lowercase()
        for ((key, color) in partyColorMap) {
            if (name.contains(key)) return color
        }
        return Color(0xFF555555)
    }
}

// ── Radius / shadow tokens (mirrors --r-* and --sh-*) ────────────────────────

object Radii {
    val Sm = 6
    val Md = 10
    val Lg = 16
    val Xl = 24
    val Pill = 100
}

// ── Typography ────────────────────────────────────────────────────────────────

private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

private val Inter = GoogleFont("Inter")
private val DmSerifDisplay = GoogleFont("DM Serif Display")

private val InterFamily = FontFamily(
    Font(googleFont = Inter, fontProvider = provider, weight = FontWeight.Normal),
    Font(googleFont = Inter, fontProvider = provider, weight = FontWeight.Medium),
    Font(googleFont = Inter, fontProvider = provider, weight = FontWeight.SemiBold),
    Font(googleFont = Inter, fontProvider = provider, weight = FontWeight.Bold),
    Font(googleFont = Inter, fontProvider = provider, weight = FontWeight.ExtraBold),
)

val DisplayFamily = FontFamily(
    Font(googleFont = DmSerifDisplay, fontProvider = provider, weight = FontWeight.Normal),
)

private val AppTypography = Typography().run {
    copy(
        displayLarge = displayLarge.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.Normal),
        displayMedium = displayMedium.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.Normal),
        displaySmall = displaySmall.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.Normal),
        headlineLarge = headlineLarge.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.Normal),
        headlineMedium = headlineMedium.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.Normal),
        headlineSmall = headlineSmall.copy(fontFamily = DisplayFamily, fontWeight = FontWeight.Normal),
        titleLarge = titleLarge.copy(fontFamily = InterFamily, fontWeight = FontWeight.Bold),
        titleMedium = titleMedium.copy(fontFamily = InterFamily, fontWeight = FontWeight.SemiBold),
        titleSmall = titleSmall.copy(fontFamily = InterFamily, fontWeight = FontWeight.SemiBold),
        bodyLarge = bodyLarge.copy(fontFamily = InterFamily),
        bodyMedium = bodyMedium.copy(fontFamily = InterFamily),
        bodySmall = bodySmall.copy(fontFamily = InterFamily),
        labelLarge = labelLarge.copy(fontFamily = InterFamily, fontWeight = FontWeight.SemiBold),
        labelMedium = labelMedium.copy(fontFamily = InterFamily, fontWeight = FontWeight.Medium),
        labelSmall = labelSmall.copy(fontFamily = InterFamily, fontWeight = FontWeight.Medium),
    )
}

/** Header / hero serif headline used for app title and major page titles. */
val HeroDisplay: TextStyle = TextStyle(
    fontFamily = DisplayFamily,
    fontWeight = FontWeight.Normal,
    fontSize = 28.sp,
    lineHeight = 34.sp,
)

// ── Colour Schemes ────────────────────────────────────────────────────────────

private val LightColorScheme = lightColorScheme(
    primary = OireachtasColors.Green700,
    onPrimary = Color.White,
    primaryContainer = OireachtasColors.Green100,
    onPrimaryContainer = OireachtasColors.Green900,
    secondary = OireachtasColors.Gold,
    onSecondary = Color.White,
    secondaryContainer = OireachtasColors.GoldLight,
    onSecondaryContainer = OireachtasColors.Text,
    tertiary = OireachtasColors.Green500,
    onTertiary = Color.White,
    background = OireachtasColors.Bg,
    onBackground = OireachtasColors.Text,
    surface = OireachtasColors.Surface,
    onSurface = OireachtasColors.Text,
    surfaceVariant = OireachtasColors.SurfaceAlt,
    onSurfaceVariant = OireachtasColors.Text2,
    outline = OireachtasColors.Border,
    outlineVariant = OireachtasColors.BorderHover,
)

private val DarkColorScheme = darkColorScheme(
    primary = OireachtasColors.Green400,
    onPrimary = OireachtasColors.Green950,
    primaryContainer = OireachtasColors.Green800,
    onPrimaryContainer = OireachtasColors.Green100,
    secondary = Color(0xFFE5C76B),
    onSecondary = Color(0xFF2A1F00),
    secondaryContainer = Color(0xFF4E3F00),
    onSecondaryContainer = OireachtasColors.GoldLight,
    tertiary = OireachtasColors.Green400,
    onTertiary = OireachtasColors.Green950,
    background = Color(0xFF12150E),
    onBackground = Color(0xFFEDE9DA),
    surface = Color(0xFF1B1F17),
    onSurface = Color(0xFFEDE9DA),
    surfaceVariant = Color(0xFF2A2E25),
    onSurfaceVariant = Color(0xFFB6B19A),
    outline = Color(0xFF4A4636),
    outlineVariant = Color(0xFF36332A),
)

// ── Theme entry point ─────────────────────────────────────────────────────────

@Composable
fun OireachtasTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
