package ie.oireachtas.explorer.data.collections

import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import ie.oireachtas.explorer.BuildConfig
import ie.oireachtas.explorer.data.saved.SavedItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Public, share-by-link research collections — backed by the same
 * Cloudflare Worker that the web app talks to. Mirrors the contract in
 * src/api/publicCollections.ts.
 *
 * The base URL is wired via the Gradle `workerBaseUrl` property; an
 * empty value disables the feature at runtime so the UI can fall back
 * to a "not configured" notice (matching the web's behaviour).
 */

@JsonClass(generateAdapter = true)
data class PublicCollection(
    val slug: String,
    val title: String,
    val description: String? = null,
    val createdAt: String,
    val itemCount: Int,
    val items: List<SavedItem>,
)

@JsonClass(generateAdapter = true)
data class PublishCollectionInput(
    val title: String,
    val description: String? = null,
    val items: List<SavedItem>,
)

class PublicCollectionException(message: String) : RuntimeException(message)

object PublicCollections {
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val collectionAdapter = moshi.adapter(PublicCollection::class.java)
    private val inputAdapter = moshi.adapter(PublishCollectionInput::class.java)
    private val client = OkHttpClient()

    fun isEnabled(): Boolean = BuildConfig.WORKER_BASE_URL.isNotBlank()

    private fun base(): String {
        val raw = BuildConfig.WORKER_BASE_URL
        if (raw.isBlank()) {
            throw PublicCollectionException("Public collections need a configured Cloudflare Worker URL.")
        }
        return raw.trimEnd('/')
    }

    suspend fun publish(input: PublishCollectionInput): PublicCollection = withContext(Dispatchers.IO) {
        val body = inputAdapter.toJson(input).toRequestBody("application/json".toMediaType())
        val req = Request.Builder().url("${base()}/collections").post(body).build()
        execute(req)
    }

    suspend fun fetch(slug: String): PublicCollection = withContext(Dispatchers.IO) {
        val req = Request.Builder().url("${base()}/collections/$slug").get().build()
        execute(req)
    }

    private fun execute(request: Request): PublicCollection {
        client.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw PublicCollectionException("Request failed (${response.code}). $body".trim())
            }
            return collectionAdapter.fromJson(body)
                ?: throw PublicCollectionException("Empty response from worker.")
        }
    }
}
