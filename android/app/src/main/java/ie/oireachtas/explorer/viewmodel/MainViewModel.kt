package ie.oireachtas.explorer.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ie.oireachtas.explorer.data.api.DailMetadata
import ie.oireachtas.explorer.data.api.OireachtasService
import ie.oireachtas.explorer.data.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MainUiState(
    val chamber: String = "dail",
    val houseNo: Int = DailMetadata.LATEST_DAIL,
    val constituencies: List<ConstituencyItem> = emptyList(),
    val allMembers: List<Member> = emptyList(),
    val loadingConstituencies: Boolean = false,
    val loadingMembers: Boolean = false,
    val error: String? = null
)

data class MemberProfileState(
    val member: Member? = null,
    val activitySummary: ActivitySummary? = null,
    val voteBreakdown: VoteBreakdown? = null,
    val debates: List<Debate> = emptyList(),
    val debatesTotal: Int = 0,
    val loadingDebates: Boolean = false,
    val divisions: List<Division> = emptyList(),
    val divisionsTotal: Int = 0,
    val loadingDivisions: Boolean = false,
    val loadingVoteBreakdown: Boolean = false,
    val questions: List<Question> = emptyList(),
    val questionsTotal: Int = 0,
    val loadingQuestions: Boolean = false,
    val legislation: List<Bill> = emptyList(),
    val legislationTotal: Int = 0,
    val loadingLegislation: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null
)

data class DebatesListState(
    val debates: List<Debate> = emptyList(),
    val total: Int = 0,
    val loading: Boolean = false,
    val error: String? = null
)

data class TranscriptState(
    val segments: List<SpeechSegment> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null
)

data class BillViewerState(
    val bill: Bill? = null,
    val loading: Boolean = false,
    val error: String? = null
)

class MainViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    private val _memberProfile = MutableStateFlow(MemberProfileState())
    val memberProfile: StateFlow<MemberProfileState> = _memberProfile.asStateFlow()

    private val _debatesList = MutableStateFlow(DebatesListState())
    val debatesList: StateFlow<DebatesListState> = _debatesList.asStateFlow()

    private val _transcript = MutableStateFlow(TranscriptState())
    val transcript: StateFlow<TranscriptState> = _transcript.asStateFlow()

    private val _billViewer = MutableStateFlow(BillViewerState())
    val billViewer: StateFlow<BillViewerState> = _billViewer.asStateFlow()

    // Selection state used to drive sub-screens. Lives in the VM (rather than
    // Compose `remember`) so it survives configuration changes without
    // dropping the user's current context. Process death still loses these —
    // the deep link handler in MainActivity is the recovery path.
    private val _selectedDebate = MutableStateFlow<Debate?>(null)
    val selectedDebate: StateFlow<Debate?> = _selectedDebate.asStateFlow()

    private val _selectedConstituency = MutableStateFlow<ConstituencyItem?>(null)
    val selectedConstituency: StateFlow<ConstituencyItem?> = _selectedConstituency.asStateFlow()

    private val _selectedPartyName = MutableStateFlow("")
    val selectedPartyName: StateFlow<String> = _selectedPartyName.asStateFlow()

    private val _selectedCommitteeName = MutableStateFlow("")
    val selectedCommitteeName: StateFlow<String> = _selectedCommitteeName.asStateFlow()

    fun selectDebate(debate: Debate) { _selectedDebate.value = debate }
    fun selectConstituency(c: ConstituencyItem) { _selectedConstituency.value = c }
    fun selectParty(name: String) { _selectedPartyName.value = name }
    fun selectCommittee(name: String) { _selectedCommitteeName.value = name }

    init {
        loadConstituencies()
        loadAllMembers()
    }

    fun setChamber(chamber: String) {
        val newHouseNo = DailMetadata.latestFor(chamber)
        _uiState.update { it.copy(chamber = chamber, houseNo = newHouseNo) }
        clearChildState()
        loadConstituencies()
        loadAllMembers()
    }

    fun setHouseNo(houseNo: Int) {
        _uiState.update { it.copy(houseNo = houseNo) }
        clearChildState()
        loadConstituencies()
        loadAllMembers()
    }

    /**
     * Reset per-screen state when chamber/session changes. Stale member,
     * transcript, and bill state from a different session would otherwise
     * appear if the user navigated back into a screen post-switch.
     */
    private fun clearChildState() {
        _memberProfile.update { MemberProfileState() }
        _debatesList.update { DebatesListState() }
        _transcript.update { TranscriptState() }
        _billViewer.update { BillViewerState() }
    }

    private fun loadConstituencies() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(loadingConstituencies = true, error = null) }
            try {
                val result = OireachtasService.getConstituencies(state.chamber, state.houseNo)
                _uiState.update { it.copy(constituencies = result, loadingConstituencies = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(loadingConstituencies = false, error = e.message) }
            }
        }
    }

    private fun loadAllMembers() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(loadingMembers = true) }
            try {
                val result = OireachtasService.getMembers(state.chamber, state.houseNo)
                _uiState.update { it.copy(allMembers = result, loadingMembers = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(loadingMembers = false, error = e.message) }
            }
        }
    }

    fun loadMemberProfile(memberUri: String) {
        val state = _uiState.value
        _memberProfile.update { MemberProfileState(loading = true) }
        viewModelScope.launch {
            try {
                val member = state.allMembers.find { it.uri == memberUri }
                    ?: OireachtasService.getMember(memberUri, state.chamber, state.houseNo)
                _memberProfile.update { it.copy(member = member, loading = false) }

                // Load activity data in parallel
                if (member != null) {
                    loadMemberDebates(member.uri, state.chamber, state.houseNo)
                    loadMemberDivisions(member.uri, state.chamber, state.houseNo)
                    loadMemberQuestions(member.uri, state.chamber, state.houseNo)
                    loadMemberLegislation(member.uri, state.chamber, state.houseNo)
                    loadVoteBreakdown(member.uri, state.chamber, state.houseNo)
                }
            } catch (e: Exception) {
                _memberProfile.update { it.copy(loading = false, error = e.message) }
            }
        }
    }

    private fun loadMemberDebates(memberUri: String, chamber: String, houseNo: Int) {
        viewModelScope.launch {
            _memberProfile.update { it.copy(loadingDebates = true) }
            try {
                val chamberId = OireachtasService.houseUri(chamber, houseNo)
                val (debates, total) = OireachtasService.getDebates(memberId = memberUri, chamberId = chamberId, limit = 20)
                _memberProfile.update { it.copy(debates = debates, debatesTotal = total, loadingDebates = false) }
            } catch (e: Exception) {
                _memberProfile.update { it.copy(loadingDebates = false) }
            }
        }
    }

    private fun loadMemberDivisions(memberUri: String, chamber: String, houseNo: Int) {
        viewModelScope.launch {
            _memberProfile.update { it.copy(loadingDivisions = true) }
            try {
                val chamberId = OireachtasService.houseUri(chamber, houseNo)
                val (divisions, total) = OireachtasService.getDivisions(memberUri, chamberId)
                _memberProfile.update { it.copy(divisions = divisions, divisionsTotal = total, loadingDivisions = false) }
            } catch (e: Exception) {
                _memberProfile.update { it.copy(loadingDivisions = false) }
            }
        }
    }

    private fun loadMemberQuestions(memberUri: String, chamber: String, houseNo: Int) {
        viewModelScope.launch {
            _memberProfile.update { it.copy(loadingQuestions = true) }
            try {
                val dateRange = DailMetadata.getHouseDateRange(chamber, houseNo)
                val (questions, total) = OireachtasService.getQuestions(
                    memberUri, dateStart = dateRange.first, dateEnd = dateRange.second
                )
                _memberProfile.update { it.copy(questions = questions, questionsTotal = total, loadingQuestions = false) }
            } catch (e: Exception) {
                _memberProfile.update { it.copy(loadingQuestions = false) }
            }
        }
    }

    private fun loadMemberLegislation(memberUri: String, chamber: String, houseNo: Int) {
        viewModelScope.launch {
            _memberProfile.update { it.copy(loadingLegislation = true) }
            try {
                val chamberId = OireachtasService.houseUri(chamber, houseNo)
                val (legislation, total) = OireachtasService.getLegislation(memberUri, chamberId)
                _memberProfile.update { it.copy(legislation = legislation, legislationTotal = total, loadingLegislation = false) }
            } catch (e: Exception) {
                _memberProfile.update { it.copy(loadingLegislation = false) }
            }
        }
    }

    private fun loadVoteBreakdown(memberUri: String, chamber: String, houseNo: Int) {
        viewModelScope.launch {
            _memberProfile.update { it.copy(loadingVoteBreakdown = true) }
            try {
                val breakdown = OireachtasService.fetchVoteBreakdown(memberUri, chamber, houseNo)
                _memberProfile.update { it.copy(voteBreakdown = breakdown, loadingVoteBreakdown = false) }
            } catch (e: Exception) {
                _memberProfile.update { it.copy(loadingVoteBreakdown = false) }
            }
        }
    }

    fun loadGlobalDebates(
        chamberId: String? = null,
        chamberType: String? = null,
        dateStart: String? = null,
        dateEnd: String? = null,
        skip: Int = 0
    ) {
        val state = _uiState.value
        viewModelScope.launch {
            _debatesList.update { it.copy(loading = true) }
            try {
                val resolvedChamberId = chamberId ?: OireachtasService.houseUri(state.chamber, state.houseNo)
                val resolvedType = chamberType ?: "house"
                val (debates, total) = OireachtasService.getDebates(
                    chamberId = if (resolvedType == "house") resolvedChamberId else null,
                    chamberType = resolvedType,
                    dateStart = dateStart,
                    dateEnd = dateEnd,
                    limit = 20,
                    skip = skip
                )
                _debatesList.update { current ->
                    if (skip == 0) {
                        DebatesListState(debates = debates, total = total, loading = false)
                    } else {
                        current.copy(
                            debates = current.debates + debates,
                            total = total,
                            loading = false
                        )
                    }
                }
            } catch (e: Exception) {
                _debatesList.update { it.copy(loading = false, error = e.message) }
            }
        }
    }

    fun loadTranscript(xmlUri: String, sectionUri: String? = null) {
        _transcript.update { TranscriptState(loading = true) }
        viewModelScope.launch {
            try {
                val segments = OireachtasService.fetchTranscript(xmlUri, sectionUri)
                _transcript.update { TranscriptState(segments = segments, loading = false) }
            } catch (e: Exception) {
                _transcript.update { TranscriptState(loading = false, error = e.message) }
            }
        }
    }

    fun clearTranscript() {
        _transcript.update { TranscriptState() }
    }

    fun loadBill(billNo: String, billYear: String) {
        _billViewer.update { BillViewerState(loading = true, error = null) }
        viewModelScope.launch {
            try {
                val (bills, _) = OireachtasService.getLegislation(billNo = billNo, billYear = billYear, limit = 1, skip = 0)
                if (bills.isNotEmpty()) {
                    _billViewer.update { BillViewerState(bill = bills.first(), loading = false) }
                } else {
                    _billViewer.update { BillViewerState(loading = false, error = "Bill not found") }
                }
            } catch (e: Exception) {
                _billViewer.update { BillViewerState(loading = false, error = e.message ?: "Failed to load bill") }
            }
        }
    }

    /**
     * Fetch transcript segments for a question's debate section.
     * Used by QuestionItem to show minister's response inline.
     * Returns filtered segments (excluding the asker).
     */
    suspend fun fetchQuestionResponse(
        xmlUri: String,
        sectionUri: String?,
        askerName: String
    ): List<ie.oireachtas.explorer.data.model.SpeechSegment> {
        val segments = OireachtasService.fetchTranscript(xmlUri, sectionUri)
        // Filter out the asker's own speech segments (same heuristic as web version)
        val askerLower = askerName.lowercase().replace("deputy ", "").trim()
        return if (askerLower.isNotEmpty()) {
            segments.filter { s ->
                !s.speakerName.lowercase().contains(askerLower)
            }
        } else segments
    }
}
