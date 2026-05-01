package ie.oireachtas.explorer.data.saved

import android.content.Context
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.Instant

/**
 * SharedPreferences-backed mirror of the web's `getSavedItems()` /
 * `toggleSavedItem()` / `removeSavedItem()` API. Items are JSON-serialised
 * into one preference key so the on-disk shape matches localStorage.
 *
 * Initialised once from OireachtasApp; consumed via the [items] flow.
 */
object SavedItemsRepository {
    private const val PREFS_NAME = "oireachtas_explorer_saved"
    private const val KEY_ITEMS = "items"

    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val listAdapter = moshi.adapter<List<SavedItem>>(
        Types.newParameterizedType(List::class.java, SavedItem::class.java)
    )

    private lateinit var prefs: android.content.SharedPreferences

    private val _items = MutableStateFlow<List<SavedItem>>(emptyList())
    val items: StateFlow<List<SavedItem>> = _items.asStateFlow()

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        _items.value = readFromDisk()
    }

    fun isSaved(id: String): Boolean = _items.value.any { it.id == id }

    fun toggle(item: SavedItem): Boolean {
        val current = _items.value
        return if (current.any { it.id == item.id }) {
            persist(current.filter { it.id != item.id })
            false
        } else {
            val stamped = item.copy(savedAt = Instant.now().toString())
            persist(listOf(stamped) + current)
            true
        }
    }

    fun remove(id: String) {
        persist(_items.value.filter { it.id != id })
    }

    private fun persist(next: List<SavedItem>) {
        val sorted = next.sortedByDescending { it.savedAt }
        _items.value = sorted
        prefs.edit().putString(KEY_ITEMS, listAdapter.toJson(sorted)).apply()
    }

    private fun readFromDisk(): List<SavedItem> {
        val raw = prefs.getString(KEY_ITEMS, null) ?: return emptyList()
        return runCatching { listAdapter.fromJson(raw) }.getOrNull()
            ?.filterNotNull()
            ?.sortedByDescending { it.savedAt }
            ?: emptyList()
    }
}
