package ie.oireachtas.explorer.data.saved

import com.squareup.moshi.JsonClass

/** Mirrors the web's SavedItemType in src/utils/savedItems.ts. */
enum class SavedItemType { member, bill, debate, speech, question }

/**
 * Browser-localStorage equivalent — kept structurally identical to the web's
 * `SavedItem` shape so a published collection round-trips between platforms.
 * See src/utils/savedItems.ts.
 */
@JsonClass(generateAdapter = true)
data class SavedItem(
    val id: String,
    val type: SavedItemType,
    val title: String,
    val subtitle: String? = null,
    val citation: String? = null,
    val quote: String? = null,
    val sourceDate: String? = null,
    val urlHash: String,
    val chamber: String,
    val houseNo: Int,
    val savedAt: String,
)
