package ie.oireachtas.explorer.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.text.googlefonts.Font
import ie.oireachtas.explorer.R

// ── Colour Palette (matched from the web CSS) ────────────────────────────────

object OireachtasColors {
    // Greens
    val Green900 = Color(0xFF0A2E0A)
    val Green800 = Color(0xFF1A4D1A)
    val Green700 = Color(0xFF006400)
    val Green500 = Color(0xFF2E7D32)
    val Green400 = Color(0xFF4CAF50)
    val Green300 = Color(0xFF81C784)
    val Green100 = Color(0xFFE8F5E9)
    val Green50 = Color(0xFFF1F8F1)

    // Neutrals
    val TextPrimary = Color(0xFF1A2E1A)
    val TextSecondary = Color(0xFF4A6B4A)
    val TextMuted = Color(0xFF5A7A5A)
    val Background = Color(0xFFF4F7F4)
    val Surface = Color(0xFFFFFFFF)
    val SurfaceAlt = Color(0xFFEEF3EE)
    val Border = Color(0xFFD4E4D4)

    // Vote colours
    val VoteFor = Color(0xFF2E7D32)
    val VoteAgainst = Color(0xFFC62828)
    val VoteAbstain = Color(0xFF78909C)

    // Orange accent
    val Orange = Color(0xFFFF8C00)
}

// ── Party Colours (matched from the web format.ts) ───────────────────────────

object PartyColors {
    private val partyColorMap = mapOf(
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

// ── Typography ────────────────────────────────────────────────────────────────

private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

private val interFont = GoogleFont("Inter")

private val InterFontFamily = FontFamily(
    Font(googleFont = interFont, fontProvider = provider, weight = FontWeight.Normal),
    Font(googleFont = interFont, fontProvider = provider, weight = FontWeight.Medium),
    Font(googleFont = interFont, fontProvider = provider, weight = FontWeight.SemiBold),
    Font(googleFont = interFont, fontProvider = provider, weight = FontWeight.Bold),
    Font(googleFont = interFont, fontProvider = provider, weight = FontWeight.ExtraBold),
)

private val AppTypography = Typography().run {
    copy(
        displayLarge = displayLarge.copy(fontFamily = InterFontFamily),
        displayMedium = displayMedium.copy(fontFamily = InterFontFamily),
        displaySmall = displaySmall.copy(fontFamily = InterFontFamily),
        headlineLarge = headlineLarge.copy(fontFamily = InterFontFamily),
        headlineMedium = headlineMedium.copy(fontFamily = InterFontFamily),
        headlineSmall = headlineSmall.copy(fontFamily = InterFontFamily),
        titleLarge = titleLarge.copy(fontFamily = InterFontFamily, fontWeight = FontWeight.Bold),
        titleMedium = titleMedium.copy(fontFamily = InterFontFamily, fontWeight = FontWeight.SemiBold),
        titleSmall = titleSmall.copy(fontFamily = InterFontFamily, fontWeight = FontWeight.SemiBold),
        bodyLarge = bodyLarge.copy(fontFamily = InterFontFamily),
        bodyMedium = bodyMedium.copy(fontFamily = InterFontFamily),
        bodySmall = bodySmall.copy(fontFamily = InterFontFamily),
        labelLarge = labelLarge.copy(fontFamily = InterFontFamily, fontWeight = FontWeight.SemiBold),
        labelMedium = labelMedium.copy(fontFamily = InterFontFamily),
        labelSmall = labelSmall.copy(fontFamily = InterFontFamily),
    )
}

// ── Colour Schemes ────────────────────────────────────────────────────────────

private val LightColorScheme = lightColorScheme(
    primary = OireachtasColors.Green700,
    onPrimary = Color.White,
    primaryContainer = OireachtasColors.Green100,
    onPrimaryContainer = OireachtasColors.Green900,
    secondary = OireachtasColors.Orange,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFFF3E0),
    onSecondaryContainer = Color(0xFF3E2723),
    tertiary = OireachtasColors.Green500,
    onTertiary = Color.White,
    background = OireachtasColors.Background,
    onBackground = OireachtasColors.TextPrimary,
    surface = OireachtasColors.Surface,
    onSurface = OireachtasColors.TextPrimary,
    surfaceVariant = OireachtasColors.SurfaceAlt,
    onSurfaceVariant = OireachtasColors.TextSecondary,
    outline = OireachtasColors.Border,
    outlineVariant = Color(0xFFA8CCA8),
)

private val DarkColorScheme = darkColorScheme(
    primary = OireachtasColors.Green300,
    onPrimary = Color(0xFF003300),
    primaryContainer = Color(0xFF1B5E20),
    onPrimaryContainer = OireachtasColors.Green100,
    secondary = Color(0xFFFFB74D),
    onSecondary = Color(0xFF3E2723),
    secondaryContainer = Color(0xFF4E342E),
    onSecondaryContainer = Color(0xFFFFF3E0),
    tertiary = OireachtasColors.Green400,
    onTertiary = OireachtasColors.Green900,
    background = Color(0xFF0F1A0F),
    onBackground = Color(0xFFE0E8E0),
    surface = Color(0xFF1A251A),
    onSurface = Color(0xFFE0E8E0),
    surfaceVariant = Color(0xFF263226),
    onSurfaceVariant = Color(0xFFA0B8A0),
    outline = Color(0xFF4A6B4A),
    outlineVariant = Color(0xFF344034),
)

// ── Theme ─────────────────────────────────────────────────────────────────────

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
