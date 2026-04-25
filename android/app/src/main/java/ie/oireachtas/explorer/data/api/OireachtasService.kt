package ie.oireachtas.explorer.data.api

import android.content.Context
import android.util.Log
import com.squareup.moshi.Types
import ie.oireachtas.explorer.data.model.*
import ie.oireachtas.explorer.data.model.Debate
import ie.oireachtas.explorer.data.model.DebateSection
import ie.oireachtas.explorer.data.model.Division
import ie.oireachtas.explorer.data.model.Question
import ie.oireachtas.explorer.data.model.Bill
import ie.oireachtas.explorer.data.model.Member
import okhttp3.OkHttpClient
import okhttp3.Request
import org.xml.sax.InputSource
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.io.StringReader
import java.security.MessageDigest
import javax.xml.parsers.DocumentBuilderFactory

private const val BASE_URL = "https://api.oireachtas.ie/v1/"
private const val TAG = "OireachtasService"

// Match web's VOTE_HISTORY_CHUNK_LIMIT in src/constants.ts. The Oireachtas
// API supports up to 500 per page; using the max minimises round trips when
// computing vote breakdowns (~10× fewer calls vs. the previous limit of 50).
const val VOTE_HISTORY_CHUNK_LIMIT = 500
const val DEFAULT_PAGE_SIZE = 20

object OireachtasService {

    private val moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val api: OireachtasApi = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()
        .create(OireachtasApi::class.java)

    private val okHttp = OkHttpClient()

    // ── Transcript caching ────────────────────────────────────────────────────
    // In-memory parsed cache (session lifetime) + disk cache (across app restarts).
    // Mirrors the web's IndexedDB transcript store. Transcripts are immutable
    // historical records, so caching is safe and saves a multi-MB XML download
    // plus the parse cost on every revisit.
    private val parsedTranscriptCache = mutableMapOf<String, List<SpeechSegment>>()
    private var transcriptDir: File? = null
    private val transcriptListAdapter by lazy {
        moshi.adapter<List<SpeechSegment>>(
            Types.newParameterizedType(List::class.java, SpeechSegment::class.java)
        )
    }

    /** Called from [ie.oireachtas.explorer.OireachtasApp] on process start. */
    fun init(context: Context) {
        transcriptDir = File(context.cacheDir, "transcripts").apply { mkdirs() }
    }

    // Session-scoped response cache. Parliamentary data is append-mostly, so
    // caching by query parameters for the app lifetime is safe and avoids
    // re-fetching when the user navigates back to a previously seen view.
    private val cache = mutableMapOf<String, Any>()

    // In-flight request deduplication. If the same key is requested twice
    // concurrently (e.g. user re-taps a member while the first fetch is
    // still pending), the second caller awaits the first's Deferred rather
    // than hitting the network again.
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val inFlight = mutableMapOf<String, Deferred<Any?>>()
    private val inFlightLock = Mutex()

    /**
     * Memoise [block] under [key]: returns the cached value if present;
     * otherwise launches [block] on a service-level scope, stores the
     * Deferred so concurrent callers share it, and caches on success.
     * Uses a service-level scope (not the caller's) so cancellation of
     * one caller doesn't cancel the shared work.
     */
    private suspend fun <T : Any> memoised(
        key: String,
        block: suspend () -> T
    ): T {
        @Suppress("UNCHECKED_CAST")
        (cache[key] as? T)?.let { return it }
        val deferred: Deferred<Any?> = inFlightLock.withLock {
            inFlight[key] ?: serviceScope.async {
                try {
                    val v = block()
                    cache[key] = v
                    v
                } finally {
                    inFlightLock.withLock { inFlight.remove(key) }
                }
            }.also { inFlight[key] = it }
        }
        @Suppress("UNCHECKED_CAST")
        return deferred.await() as T
    }

    fun houseUri(chamber: String, houseNo: Int): String =
        "https://data.oireachtas.ie/ie/oireachtas/house/$chamber/$houseNo"

    // ── Constituencies ────────────────────────────────────────────────────────

    suspend fun getConstituencies(chamber: String, houseNo: Int): List<ConstituencyItem> =
        memoised("const:$chamber:$houseNo") {
            api.getConstituencies(chamber, houseNo).results
        }

    // ── Members ───────────────────────────────────────────────────────────────

    suspend fun getMembers(chamber: String, houseNo: Int, constCode: String? = null): List<Member> =
        memoised("members:$chamber:$houseNo:$constCode") {
            api.getMembers(chamber, houseNo, constCode).results
                .map { normaliseMember(it.member, chamber, houseNo) }
        }

    suspend fun getMember(memberId: String, chamber: String, houseNo: Int): Member? {
        // Memoised holds non-null. Query first; only stash if found.
        @Suppress("UNCHECKED_CAST")
        (cache["member:$memberId"] as? Member)?.let { return it }
        val m = api.getMembers(chamber, houseNo, memberId = memberId)
            .results.firstOrNull()?.member?.let { normaliseMember(it, chamber, houseNo) }
        if (m != null) cache["member:$memberId"] = m
        return m
    }

    // ── Debates ───────────────────────────────────────────────────────────────

    suspend fun getDebates(
        memberId: String? = null,
        chamberId: String? = null,
        chamberType: String? = null,
        dateStart: String? = null,
        dateEnd: String? = null,
        limit: Int = DEFAULT_PAGE_SIZE,
        skip: Int = 0
    ): Pair<List<Debate>, Int> = memoised(
        "debates:$memberId:$chamberId:$chamberType:$dateStart:$dateEnd:$limit:$skip"
    ) {
        val result = api.getDebates(memberId, chamberId, chamberType, dateStart, dateEnd, limit, skip)
        val total = result.head?.counts?.resultCount ?: result.results.size
        val debates = result.results.map { item ->
            val d = item.debate
            val sections = d.debateSections?.map { s ->
                DebateSection(
                    uri = s.debateSection?.uri ?: "",
                    title = s.debateSection?.showAs ?: ""
                )
            } ?: emptyList()
            val firstSection = d.debateSections?.firstOrNull()?.debateSection
            Debate(
                uri = firstSection?.uri ?: d.uri,
                date = d.date ?: "",
                title = firstSection?.showAs ?: d.debateType ?: "Debate",
                chamber = chamberFromUri(d.uri),
                xmlUri = d.formats?.xml?.uri,
                sections = sections,
                debateSectionUri = firstSection?.uri
            )
        }
        debates to total
    }

    // ── Divisions ─────────────────────────────────────────────────────────────

    suspend fun getDivisions(
        memberId: String,
        chamberId: String? = null,
        limit: Int = 50,
        skip: Int = 0
    ): Pair<List<Division>, Int> = memoised(
        "divisions:$memberId:$chamberId:$limit:$skip"
    ) {
        val result = api.getDivisions(memberId, chamberId, limit, skip)
        val total = result.head?.counts?.resultCount ?: result.results.size
        val divisions = result.results.map { item ->
            val d = item.division
            val tallyShowAs = d.memberTally?.showAs ?: ""
            val voteType = parseTallyType(tallyShowAs)
            val title = d.debate?.showAs ?: d.subject?.showAs ?: d.voteId ?: "Division"
            Division(
                uri = d.uri,
                date = d.date ?: "",
                title = title,
                voteType = voteType,
                voteLabel = tallyShowAs.ifEmpty {
                    when (voteType) {
                        "ta" -> "Tá"
                        "nil" -> "Níl"
                        else -> "Staon"
                    }
                },
                outcome = d.outcome ?: "",
                tallyFor = d.tallies?.taVotes?.tally ?: 0,
                tallyAgainst = d.tallies?.nilVotes?.tally ?: 0,
                xmlUri = d.debate?.formats?.xml?.uri,
                debateSectionUri = d.debate?.debateSection
            )
        }
        divisions to total
    }

    // ── Questions ─────────────────────────────────────────────────────────────

    suspend fun getQuestions(
        memberId: String,
        dateStart: String? = null,
        dateEnd: String? = null,
        limit: Int = DEFAULT_PAGE_SIZE,
        skip: Int = 0
    ): Pair<List<Question>, Int> = memoised(
        "questions:$memberId:$dateStart:$dateEnd:$limit:$skip"
    ) {
        val result = api.getQuestions(memberId, dateStart = dateStart, dateEnd = dateEnd, limit = limit, skip = skip)
        val total = result.head?.counts?.resultCount ?: result.results.size
        val questions = result.results.map { item ->
            val q = item.question
            val role = if (q.by?.uri?.endsWith(memberId) == true) "asked" else "answered"
            Question(
                uri = q.uri,
                date = q.date ?: "",
                questionType = q.questionType ?: "",
                questionNumber = q.questionNumber ?: 0,
                questionText = q.showAs ?: "",
                askedBy = q.by?.showAs ?: "",
                department = q.to?.showAs ?: "",
                role = role,
                xmlUri = q.debateSection?.formats?.xml?.uri,
                debateSectionUri = q.debateSection?.uri
            )
        }
        questions to total
    }

    // ── Legislation ───────────────────────────────────────────────────────────

    suspend fun getLegislation(
        memberId: String? = null,
        chamberId: String? = null,
        billNo: String? = null,
        billYear: String? = null,
        limit: Int = DEFAULT_PAGE_SIZE,
        skip: Int = 0
    ): Pair<List<Bill>, Int> = memoised(
        "legislation:$memberId:$chamberId:$billNo:$billYear:$limit:$skip"
    ) {
        val result = api.getLegislation(memberId, chamberId, billNo, billYear, limit, skip)
        val total = result.head?.counts?.resultCount ?: result.results.size
        val bills = result.results.map { item ->
            val b = item.bill
            Bill(
                uri = b.uri,
                billNo = b.billNo ?: "",
                billYear = b.billYear ?: "",
                title = b.shortTitleEn?.trim() ?: "Bill",
                longTitleEn = b.longTitleEn,
                status = b.status ?: "",
                source = b.source,
                originHouse = b.originHouse?.showAs ?: "",
                sponsors = b.sponsors?.mapNotNull { it.sponsor?.by?.showAs }?.filter { it.isNotEmpty() } ?: emptyList(),
                currentStage = b.mostRecentStage?.event?.showAs ?: "—",
                lastUpdated = b.lastUpdated,
                versions = b.versions?.map { v ->
                    BillDocument(
                        title = v.version.showAs ?: "Version",
                        date = v.version.date,
                        pdfUri = v.version.formats?.pdf?.uri,
                        xmlUri = v.version.formats?.xml?.uri
                    )
                } ?: emptyList(),
                relatedDocs = b.relatedDocs?.map { d ->
                    BillDocument(
                        title = d.relatedDoc.showAs ?: "Document",
                        date = d.relatedDoc.date,
                        pdfUri = d.relatedDoc.formats?.pdf?.uri,
                        xmlUri = d.relatedDoc.formats?.xml?.uri
                    )
                } ?: emptyList()
            )
        }
        bills to total
    }

    // ── Transcripts ───────────────────────────────────────────────────────────

    suspend fun fetchTranscript(xmlUri: String, sectionUri: String? = null): List<SpeechSegment> {
        val cacheKey = "$xmlUri::${sectionUri ?: "ALL"}"
        parsedTranscriptCache[cacheKey]?.let { return it }
        return withContext(Dispatchers.IO) {
            // Try disk cache before going to network. Avoids re-downloading the
            // (often multi-MB) XML and re-parsing it on subsequent app launches.
            readTranscriptFromDisk(cacheKey)?.let {
                parsedTranscriptCache[cacheKey] = it
                return@withContext it
            }

            val request = Request.Builder().url(xmlUri).build()
            val body = try {
                okHttp.newCall(request).execute().use { it.body?.string() ?: return@withContext emptyList() }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to fetch transcript: $xmlUri", e)
                return@withContext emptyList()
            }
            val parsed = parseTranscriptXml(body, sectionUri)
            if (parsed.isNotEmpty()) {
                parsedTranscriptCache[cacheKey] = parsed
                writeTranscriptToDisk(cacheKey, parsed)
            }
            parsed
        }
    }

    private fun cacheFileFor(key: String): File? {
        val dir = transcriptDir ?: return null
        // Hash the key to a short stable filename — the raw key is a long URL.
        val md = MessageDigest.getInstance("SHA-1").digest(key.toByteArray())
        val hex = md.joinToString("") { "%02x".format(it) }
        return File(dir, "$hex.json")
    }

    private fun readTranscriptFromDisk(key: String): List<SpeechSegment>? {
        val f = cacheFileFor(key) ?: return null
        if (!f.exists()) return null
        return try {
            transcriptListAdapter.fromJson(f.readText())
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read transcript cache for $key", e)
            null
        }
    }

    private fun writeTranscriptToDisk(key: String, segments: List<SpeechSegment>) {
        val f = cacheFileFor(key) ?: return
        try {
            f.writeText(transcriptListAdapter.toJson(segments))
        } catch (e: Exception) {
            Log.w(TAG, "Failed to write transcript cache for $key", e)
        }
    }

    // ── Activity Summary ──────────────────────────────────────────────────────

    suspend fun fetchActivitySummary(
        memberUri: String,
        chamber: String,
        houseNo: Int
    ): ActivitySummary {
        val chamberId = houseUri(chamber, houseNo)
        val dateRange = DailMetadata.getHouseDateRange(chamber, houseNo)
        val (_, debatesTotal) = getDebates(memberId = memberUri, chamberId = chamberId, limit = 20)
        val (_, votesTotal) = getDivisions(memberId = memberUri, chamberId = chamberId, limit = 20)
        val (_, questionsTotal) = getQuestions(memberId = memberUri, dateStart = dateRange.first, dateEnd = dateRange.second, limit = 20)
        val (_, billsTotal) = getLegislation(memberId = memberUri, chamberId = chamberId, limit = 20)
        return ActivitySummary(
            totalDebates = debatesTotal,
            totalVotes = votesTotal,
            totalQuestions = questionsTotal,
            totalBills = billsTotal
        )
    }

    suspend fun fetchVoteBreakdown(
        memberUri: String,
        chamber: String,
        houseNo: Int
    ): VoteBreakdown {
        val chamberId = houseUri(chamber, houseNo)
        val allDivisions = mutableListOf<Division>()
        var skip = 0
        val chunkLimit = VOTE_HISTORY_CHUNK_LIMIT

        while (true) {
            val (divisions, total) = getDivisions(memberUri, chamberId, chunkLimit, skip)
            allDivisions.addAll(divisions)
            if (divisions.size < chunkLimit || allDivisions.size >= total) break
            skip += chunkLimit
        }

        var ta = 0; var nil = 0; var staon = 0
        for (d in allDivisions) {
            when (d.voteType) {
                "ta" -> ta++
                "nil" -> nil++
                "staon" -> staon++
            }
        }
        return VoteBreakdown(ta, nil, staon, allDivisions.size)
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private fun parseTranscriptXml(xml: String, sectionUri: String?): List<SpeechSegment> {
        return try {
            val factory = DocumentBuilderFactory.newInstance()
            val builder = factory.newDocumentBuilder()
            val doc = builder.parse(InputSource(StringReader(xml)))
            doc.documentElement.normalize()

            // Map TLCPerson eId -> Pair(Name, Uri)
            val speakerRegistry = mutableMapOf<String, Pair<String, String?>>()
            val tlcPersons = doc.getElementsByTagName("TLCPerson")
            for (i in 0 until tlcPersons.length) {
                val el = tlcPersons.item(i) as? org.w3c.dom.Element ?: continue
                val eId = el.getAttribute("eId")
                if (eId.isNotEmpty()) {
                    val showAs = el.getAttribute("showAs").ifEmpty { eId.replace("_", " ") }
                    val href = el.getAttribute("href").ifEmpty { null }
                    val uri = href?.let { "https://data.oireachtas.ie$it" }
                    speakerRegistry[eId] = showAs to uri
                }
            }

            val segments = mutableListOf<SpeechSegment>()
            val speeches = doc.getElementsByTagName("speech")

            for (i in 0 until speeches.length) {
                val speech = speeches.item(i) as? org.w3c.dom.Element ?: continue

                // If filtering by section, check ancestor section id
                if (sectionUri != null) {
                    val section = generateSequence(speech.parentNode) { it.parentNode }
                        .filterIsInstance<org.w3c.dom.Element>()
                        .firstOrNull { it.tagName == "debateSection" }
                    val sectionId = section?.getAttribute("id") ?: ""
                    if (sectionUri.isNotEmpty() && !sectionUri.contains(sectionId)) continue
                }

                val rawBy = speech.getAttribute("by") ?: ""
                val speakerId = rawBy.replace("#", "")
                val meta = speakerRegistry[speakerId]
                val speakerName = meta?.first ?: (speakerId.replace("_", " ").ifEmpty { "Unknown Speaker" })
                val memberUri = meta?.second

                val paras = mutableListOf<String>()
                
                // Parse child nodes to support both <p> and <table>
                val children = speech.getElementsByTagName("*")
                val skipNodes = mutableSetOf<org.w3c.dom.Node>()
                
                for (j in 0 until children.length) {
                    val node = children.item(j) as? org.w3c.dom.Element ?: continue
                    if (skipNodes.contains(node)) continue

                    if (node.tagName.equals("table", ignoreCase = true)) {
                        val tableText = parseTableToMarkdown(node)
                        if (tableText.isNotEmpty()) paras.add(tableText)

                        // Skip all descendants of the table
                        val tableDescendants = node.getElementsByTagName("*")
                        for (k in 0 until tableDescendants.length) {
                            skipNodes.add(tableDescendants.item(k))
                        }
                    } else if (node.tagName.equals("p", ignoreCase = true)) {
                        // Capture inner content as HTML-like markup so the UI
                        // can render bold/italic/etc. via AnnotatedString.fromHtml.
                        // Plain text is also valid HTML, so simple paragraphs
                        // pass through unchanged.
                        val markup = nodeInnerHtml(node).trim()
                        if (markup.isNotEmpty()) paras.add(markup)
                    }
                }
                
                if (paras.isNotEmpty()) {
                    // Coalesce consecutive speeches by same speaker
                    val last = segments.lastOrNull()
                    if (last != null && last.speakerId == speakerId) {
                        last.paragraphs = last.paragraphs + paras
                    } else {
                        segments.add(SpeechSegment(speakerId, speakerName, memberUri, paras))
                    }
                }
            }
            segments
        } catch (e: Exception) {
            Log.e(TAG, "XML parse error", e)
            emptyList()
        }
    }

    /**
     * Serialise an Element's children to a small HTML fragment. Akoma Ntoso
     * speeches use plain HTML-compatible inline tags (b, i, em, strong, br),
     * so the output is safe to feed straight into AnnotatedString.fromHtml.
     * Unknown tags are rendered as their text content.
     */
    private fun nodeInnerHtml(element: org.w3c.dom.Element): String {
        val sb = StringBuilder()
        val children = element.childNodes
        for (i in 0 until children.length) {
            val child = children.item(i)
            sb.append(serialiseNode(child))
        }
        return sb.toString()
    }

    private fun serialiseNode(node: org.w3c.dom.Node): String {
        return when (node.nodeType) {
            org.w3c.dom.Node.TEXT_NODE -> escapeHtml(node.nodeValue ?: "")
            org.w3c.dom.Node.ELEMENT_NODE -> {
                val el = node as org.w3c.dom.Element
                val tag = el.tagName.lowercase()
                val keep = tag in setOf("b", "i", "em", "strong", "u", "br", "sup", "sub")
                if (tag == "br") return "<br/>"
                val inner = nodeInnerHtml(el)
                if (keep) "<$tag>$inner</$tag>" else inner
            }
            else -> ""
        }
    }

    private fun escapeHtml(s: String): String =
        s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    private fun parseTableToMarkdown(tableNode: org.w3c.dom.Element): String {
        val rows = tableNode.getElementsByTagName("tr")
        val sb = StringBuilder()
        for (i in 0 until rows.length) {
            val row = rows.item(i) as? org.w3c.dom.Element ?: continue
            val cells = mutableListOf<String>()
            
            // Get both th and td
            val children = row.childNodes
            var isHeader = false
            for (j in 0 until children.length) {
                val cell = children.item(j) as? org.w3c.dom.Element ?: continue
                if (cell.tagName.equals("th", ignoreCase = true) || cell.tagName.equals("td", ignoreCase = true)) {
                    if (cell.tagName.equals("th", ignoreCase = true)) isHeader = true
                    cells.add(cell.textContent.replace("\n", " ").trim())
                }
            }
            if (cells.isNotEmpty()) {
                sb.append("| ").append(cells.joinToString(" | ")).append(" |\n")
                if (i == 0 || isHeader) {
                    sb.append("|").append(cells.joinToString("|") { "---" }).append("|\n")
                }
            }
        }
        return sb.toString().trim()
    }

    /**
     * Normalise a raw API member into our domain model.
     * Mirrors the web version's extractParty(), extractConstituency(), etc.
     */
    private fun normaliseMember(m: MemberDetail, chamber: String, houseNo: Int): Member {
        val party = extractParty(m.memberships ?: emptyList())
        val (constName, constCode) = extractConstituency(m.memberships ?: emptyList())
        val offices = extractOffices(m.memberships ?: emptyList())
        val committees = extractCommittees(m.memberships ?: emptyList(), chamber, houseNo)
        val photoUrl = "${m.uri}/image/thumb"

        return Member(
            uri = m.uri,
            memberCode = m.memberCode,
            fullName = m.fullName,
            firstName = m.firstName,
            lastName = m.lastName,
            party = party,
            constituency = constName,
            constituencyCode = constCode,
            photoUrl = photoUrl,
            offices = offices,
            committees = committees
        )
    }

    /**
     * Extract the current party, preferring active memberships (no end date)
     * with the most recent start date. Falls back to the party with the latest
     * end date if none are active.
     * Matches the web version's extractParty() logic.
     */
    private fun extractParty(memberships: List<Membership>): String {
        var activeParty = ""
        var activeStart = ""
        var endedParty = ""
        var endedDate = ""

        for (ms in memberships) {
            val detail = ms.membership ?: continue
            for (p in detail.parties ?: emptyList()) {
                val party = p.party ?: continue
                val start = party.dateRange?.start ?: ""
                val end = party.dateRange?.end
                if (end == null) {
                    if (start >= activeStart) {
                        activeStart = start
                        activeParty = party.showAs ?: ""
                    }
                } else if (end > endedDate) {
                    endedDate = end
                    endedParty = party.showAs ?: ""
                }
            }
        }
        return activeParty.ifEmpty { endedParty.ifEmpty { "Independent" } }
    }

    /**
     * Extract constituency/panel from membership represents array.
     * Matches the web version's extractConstituency() logic.
     */
    private fun extractConstituency(memberships: List<Membership>): Pair<String, String> {
        // First pass: look for explicit constituency or panel
        for (ms in memberships) {
            val detail = ms.membership ?: continue
            for (rep in detail.represents ?: emptyList()) {
                val r = rep.represent ?: continue
                val rt = r.representType ?: ""
                if (rt == "constituency" || rt == "panel") {
                    return (r.showAs ?: "") to (r.representCode ?: "")
                }
            }
        }
        // Second pass: fall back to first represent
        for (ms in memberships) {
            val detail = ms.membership ?: continue
            val rep = detail.represents?.firstOrNull()?.represent
            if (rep != null) {
                return (rep.showAs ?: "") to (rep.representCode ?: "")
            }
        }
        return "" to ""
    }

    /**
     * Extract current offices (no end date).
     */
    private fun extractOffices(memberships: List<Membership>): List<String> {
        val offices = mutableListOf<String>()
        for (ms in memberships) {
            val detail = ms.membership ?: continue
            for (o in detail.offices ?: emptyList()) {
                val office = o.office ?: continue
                if (office.dateRange?.end == null) {
                    val name = office.officeName?.showAs ?: office.showAs ?: continue
                    offices.add(name)
                }
            }
        }
        return offices
    }

    /**
     * Extract active committee memberships for the specific house.
     */
    private fun extractCommittees(memberships: List<Membership>, chamber: String, houseNo: Int): List<CommitteeMembership> {
        for (ms in memberships) {
            val detail = ms.membership ?: continue
            val h = detail.house ?: continue
            if (h.houseCode != chamber || h.houseNo != houseNo.toString()) continue
            val raw = detail.committees ?: emptyList()
            return raw
                .filter { it.memberDateRange?.end == null }
                .mapNotNull { c ->
                    val name = c.committeeName?.firstOrNull()?.nameEn ?: return@mapNotNull null
                    if (name.isEmpty()) return@mapNotNull null
                    val role = when (val r = c.role) {
                        is Map<*, *> -> (r["title"] as? String) ?: "Member"
                        else -> "Member"
                    }
                    CommitteeMembership(name, c.uri, role)
                }
        }
        return emptyList()
    }

    private fun chamberFromUri(uri: String): String {
        if (uri.contains("/dail/")) return "Dáil Éireann"
        if (uri.contains("/seanad/")) return "Seanad Éireann"
        return "Committee"
    }

    private fun parseTallyType(showAs: String): String {
        val s = showAs.lowercase()
        return when {
            s == "tá" || s == "ta" -> "ta"
            s == "níl" || s == "nil" -> "nil"
            else -> "staon"
        }
    }
}
