package ie.oireachtas.explorer.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.fromHtml
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ie.oireachtas.explorer.data.model.*
import ie.oireachtas.explorer.ui.components.DebateCard
import ie.oireachtas.explorer.ui.components.LoadingIndicator
import ie.oireachtas.explorer.ui.components.MemberAvatar
import ie.oireachtas.explorer.ui.components.SectionHeader
import ie.oireachtas.explorer.ui.theme.OireachtasColors
import ie.oireachtas.explorer.ui.theme.PartyColors
import ie.oireachtas.explorer.viewmodel.MainViewModel
import ie.oireachtas.explorer.viewmodel.MemberProfileState
import kotlinx.coroutines.launch

private enum class ProfileTab(val label: String) {
    OVERVIEW("Overview"), DEBATES("Debates"), VOTES("Votes"),
    QUESTIONS("Questions"), BILLS("Bills"), COMMITTEES("Committees")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MemberProfileScreen(
    state: MemberProfileState,
    chamber: String, houseNo: Int,
    viewModel: MainViewModel,
    onBack: () -> Unit,
    onDebateClick: (Debate) -> Unit,
    onMemberClick: (String) -> Unit,
    onPartyClick: (String) -> Unit,
    onCommitteeClick: (String) -> Unit,
    onBillClick: (String, String) -> Unit
) {
    val member = state.member
    var selectedTab by remember { mutableStateOf(ProfileTab.OVERVIEW) }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(member?.fullName ?: "Member") },
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
        )
        if (state.loading || member == null) { LoadingIndicator(); return@Column }

        // Profile header
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            MemberAvatar(member.photoUrl, member.fullName, size = 80.dp)
            Spacer(Modifier.width(16.dp))
            Column {
                Text(member.fullName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Box(Modifier.size(10.dp).clip(CircleShape).background(PartyColors.partyColor(member.party)))
                    Text(member.party, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold, textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { onPartyClick(member.party) })
                }
                if (member.constituency.isNotEmpty()) {
                    Text(member.constituency, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                member.offices.forEach { office ->
                    AssistChip(onClick = {}, label = { Text(office, style = MaterialTheme.typography.labelSmall) }, shape = RoundedCornerShape(16.dp))
                }
            }
        }

        ScrollableTabRow(selectedTab.ordinal, edgePadding = 0.dp, containerColor = MaterialTheme.colorScheme.surface) {
            ProfileTab.entries.forEach { tab -> Tab(selectedTab == tab, onClick = { selectedTab = tab }, text = { Text(tab.label) }) }
        }

        when (selectedTab) {
            ProfileTab.OVERVIEW -> OverviewTab(state, onPartyClick)
            ProfileTab.DEBATES -> DebatesTab(state.debates, state.loadingDebates, onDebateClick)
            ProfileTab.VOTES -> VotesTab(state, onDebateClick)
            ProfileTab.QUESTIONS -> QuestionsTab(state.questions, state.loadingQuestions, viewModel, onMemberClick)
            ProfileTab.BILLS -> BillsTab(state.legislation, state.loadingLegislation, onBillClick)
            ProfileTab.COMMITTEES -> CommitteesTab(state, onCommitteeClick)
        }
    }
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
@Composable
private fun OverviewTab(state: MemberProfileState, onPartyClick: (String) -> Unit) {
    val member = state.member ?: return
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { SectionHeader("Activity Summary") }
        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), elevation = CardDefaults.cardElevation(1.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatRow("Debates", state.debatesTotal.toString(), state.loadingDebates)
                    StatRow("Divisions (votes)", state.divisionsTotal.toString(), state.loadingDivisions)
                    StatRow("Questions", state.questionsTotal.toString(), state.loadingQuestions)
                    StatRow("Bills", state.legislationTotal.toString(), state.loadingLegislation)
                    StatRow("Committees", member.committees.size.toString(), false)
                }
            }
        }
        item { VoteBreakdownCard(state) }
        if (member.committees.isNotEmpty()) {
            item { SectionHeader("Committees") }
            items(member.committees) { c ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 8.dp, bottom = 4.dp)) {
                    Text("•  ", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    Column {
                        Text(c.name, style = MaterialTheme.typography.bodySmall)
                        Text(c.role, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatRow(label: String, value: String, loading: Boolean) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        if (loading) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
        else Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
    }
}

// ── Vote Breakdown Donut ──────────────────────────────────────────────────────
@Composable
private fun VoteBreakdownCard(state: MemberProfileState) {
    val bd = state.voteBreakdown
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), elevation = CardDefaults.cardElevation(1.dp)) {
        Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Voting Record", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            if (state.loadingVoteBreakdown || bd == null) {
                if (state.loadingVoteBreakdown) { CircularProgressIndicator(Modifier.size(24.dp)); Text("Loading…", style = MaterialTheme.typography.bodySmall) }
                else Text("No vote data yet.", style = MaterialTheme.typography.bodySmall)
            } else if (bd.sampleSize == 0) {
                Text("No votes recorded.", style = MaterialTheme.typography.bodySmall)
            } else {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(120.dp), contentAlignment = Alignment.Center) {
                        val total = bd.sampleSize.toFloat()
                        Canvas(Modifier.size(120.dp)) {
                            val sw = 20f; val r = (size.minDimension - sw) / 2
                            val c = Offset(size.width / 2, size.height / 2)
                            val s = Size(r * 2, r * 2); val o = Offset(c.x - r, c.y - r)
                            var a = -90f
                            val tS = (bd.ta / total) * 360f; val nS = (bd.nil / total) * 360f; val sS = (bd.staon / total) * 360f
                            drawArc(OireachtasColors.VoteFor, a, tS, false, o, s, style = Stroke(sw)); a += tS
                            drawArc(OireachtasColors.VoteAgainst, a, nS, false, o, s, style = Stroke(sw)); a += nS
                            drawArc(OireachtasColors.VoteAbstain, a, sS, false, o, s, style = Stroke(sw))
                        }
                        Text("${bd.sampleSize}", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    }
                    Spacer(Modifier.width(24.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        VoteLeg("Tá", bd.ta, OireachtasColors.VoteFor)
                        VoteLeg("Níl", bd.nil, OireachtasColors.VoteAgainst)
                        VoteLeg("Staon", bd.staon, OireachtasColors.VoteAbstain)
                    }
                }
            }
        }
    }
}

@Composable
private fun VoteLeg(label: String, count: Int, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(color))
        Text(label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
        Text("$count", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ── Debates Tab ───────────────────────────────────────────────────────────────
@Composable
private fun DebatesTab(debates: List<Debate>, loading: Boolean, onDebateClick: (Debate) -> Unit) {
    if (loading) { LoadingIndicator(); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(debates) { d -> DebateCard(d, showSpokeInDebate = true) { onDebateClick(d) } }
        if (debates.isEmpty()) item { Text("No debates found.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

// ── Votes Tab ─────────────────────────────────────────────────────────────────
@Composable
private fun VotesTab(state: MemberProfileState, onDebateClick: (Debate) -> Unit) {
    if (state.loadingDivisions) { LoadingIndicator(); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(state.divisions) { division ->
            val canViewDebate = division.xmlUri != null && division.debateSectionUri != null
            Card(Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(1.dp), shape = RoundedCornerShape(10.dp)) {
                Column(Modifier.padding(12.dp)) {
                    Text(division.title, style = MaterialTheme.typography.titleSmall)
                    if (division.date.isNotEmpty()) Text(division.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        val vc = when (division.voteType) { "ta" -> OireachtasColors.VoteFor; "nil" -> OireachtasColors.VoteAgainst; else -> OireachtasColors.VoteAbstain }
                        Text(division.voteLabel, style = MaterialTheme.typography.labelSmall, color = vc, fontWeight = FontWeight.Bold)
                        if (division.outcome.isNotEmpty()) Text(division.outcome, style = MaterialTheme.typography.labelSmall)
                        if (division.tallyFor > 0 || division.tallyAgainst > 0) {
                            Spacer(Modifier.weight(1f))
                            Text("${division.tallyFor}", color = OireachtasColors.VoteFor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("–", fontSize = 12.sp)
                            Text("${division.tallyAgainst}", color = OireachtasColors.VoteAgainst, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (canViewDebate) {
                        TextButton(onClick = {
                            onDebateClick(Debate(division.uri, division.date, division.title, "", division.xmlUri, emptyList(), division.debateSectionUri))
                        }, contentPadding = PaddingValues(0.dp)) {
                            Text("↗ View Debate Background", fontSize = 12.sp)
                        }
                    }
                }
            }
        }
        if (state.divisions.isEmpty()) item { Text("No votes found.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

// ── Questions Tab with expandable responses ───────────────────────────────────
@Composable
private fun QuestionsTab(questions: List<Question>, loading: Boolean, viewModel: MainViewModel, onMemberClick: (String) -> Unit) {
    if (loading) { LoadingIndicator(); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(questions) { q -> QuestionCard(q, viewModel, onMemberClick) }
        if (questions.isEmpty()) item { Text("No questions found.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
private fun QuestionCard(q: Question, viewModel: MainViewModel, onMemberClick: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    var expandedText by remember { mutableStateOf(false) }
    var responseLoading by remember { mutableStateOf(false) }
    var responses by remember { mutableStateOf<List<SpeechSegment>>(emptyList()) }
    val scope = rememberCoroutineScope()
    val hasTranscript = q.xmlUri != null && q.debateSectionUri != null

    Card(Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(1.dp), shape = RoundedCornerShape(10.dp)) {
        Column(Modifier.padding(12.dp)) {
            Text(
                q.questionText.ifEmpty { "Question #${q.questionNumber}" },
                style = MaterialTheme.typography.titleSmall,
                maxLines = if (expandedText) Int.MAX_VALUE else 3,
                modifier = Modifier.clickable { expandedText = !expandedText }
            )
            if (q.date.isNotEmpty()) Text(q.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (q.questionType.isNotEmpty()) Text(q.questionType, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                if (q.department.isNotEmpty()) Text("→ ${q.department}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            // Expandable response button
            if (hasTranscript) {
                TextButton(
                    onClick = {
                        if (expanded) { expanded = false; return@TextButton }
                        expanded = true
                        if (responses.isNotEmpty()) return@TextButton
                        scope.launch {
                            responseLoading = true
                            try {
                                responses = viewModel.fetchQuestionResponse(q.xmlUri!!, q.debateSectionUri, q.askedBy)
                            } catch (_: Exception) { /* silently fail */ }
                            responseLoading = false
                        }
                    },
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(if (expanded) "Hide Response" else "View Official Response", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }

                if (expanded) {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            // Green accent bar on left via a Row with a colored box
                            when {
                                responseLoading -> {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                                        Text("Loading response…", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                                responses.isNotEmpty() -> {
                                    responses.forEach { seg ->
                                        Text(
                                            seg.speakerName,
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = if (seg.memberUri != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                            textDecoration = if (seg.memberUri != null) TextDecoration.Underline else TextDecoration.None,
                                            modifier = if (seg.memberUri != null) Modifier.clickable { onMemberClick(seg.memberUri) } else Modifier
                                        )
                                        seg.paragraphs.forEach { p ->
                                            if (p.trim().startsWith("|") && p.contains("\n")) {
                                                MarkdownTable(p)
                                            } else {
                                                Text(AnnotatedString.fromHtml(p), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 4.dp))
                                            }
                                        }
                                        Spacer(Modifier.height(8.dp))
                                    }
                                }
                                else -> Text("No recorded response transcript found.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Bills Tab ─────────────────────────────────────────────────────────────────
@Composable
private fun BillsTab(legislation: List<Bill>, loading: Boolean, onBillClick: (String, String) -> Unit) {
    if (loading) { LoadingIndicator(); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(legislation) { bill ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                onClick = { 
                    onBillClick(bill.billNo, bill.billYear)
                },
                elevation = CardDefaults.cardElevation(1.dp), 
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text(
                        bill.title, 
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.primary,
                        textDecoration = TextDecoration.Underline
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (bill.status.isNotEmpty()) {
                            val sc = when (bill.status.lowercase()) { "enacted" -> OireachtasColors.VoteFor; "current", "published" -> MaterialTheme.colorScheme.primary; "defeated", "rejected" -> OireachtasColors.VoteAgainst; else -> MaterialTheme.colorScheme.onSurfaceVariant }
                            Text(bill.status, style = MaterialTheme.typography.labelSmall, color = sc, fontWeight = FontWeight.SemiBold)
                        }
                        Text("${bill.billNo}/${bill.billYear}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (bill.sponsors.isNotEmpty()) Text("Sponsored by: ${bill.sponsors.joinToString(", ")}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        if (legislation.isEmpty()) item { Text("No bills found.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

// ── Committees Tab ────────────────────────────────────────────────────────────
@Composable
private fun CommitteesTab(state: MemberProfileState, onCommitteeClick: (String) -> Unit) {
    val member = state.member ?: return
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(member.committees) { c ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                onClick = { onCommitteeClick(c.name) },
                elevation = CardDefaults.cardElevation(1.dp),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text(
                        c.name, 
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.primary,
                        textDecoration = TextDecoration.Underline
                    )
                    Text(c.role, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        if (member.committees.isEmpty()) item { Text("No committee memberships found.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
fun MarkdownTable(markdown: String) {
    val lines = markdown.trim().lines()
    if (lines.size < 2) return
    
    // Parse rows, ignoring the separator line (usually line 1)
    val rows = lines.filterIndexed { index, line -> 
        // Skip the |---|---| line
        !(index == 1 && line.replace(" ", "").replace("|", "").replace("-", "").isEmpty())
    }.map { line ->
        line.trim().removePrefix("|").removeSuffix("|").split("|").map { it.trim() }
    }
    
    if (rows.isEmpty()) return

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(4.dp))
            .clip(RoundedCornerShape(4.dp))
            .horizontalScroll(rememberScrollState())
    ) {
        rows.forEachIndexed { rowIndex, row ->
            val isHeader = rowIndex == 0
            val bgColor = if (isHeader) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent
            
            Row(
                modifier = Modifier
                    .background(bgColor)
                    .drawBehind {
                        if (rowIndex < rows.size - 1) {
                            drawLine(
                                color = Color.LightGray,
                                start = Offset(0f, size.height),
                                end = Offset(size.width, size.height),
                                strokeWidth = 1f
                            )
                        }
                    }
            ) {
                row.forEachIndexed { colIndex, cell ->
                    Text(
                        text = cell,
                        style = if (isHeader) MaterialTheme.typography.labelMedium else MaterialTheme.typography.bodySmall,
                        fontWeight = if (isHeader) FontWeight.Bold else FontWeight.Normal,
                        modifier = Modifier
                            .padding(12.dp)
                            .widthIn(min = 100.dp),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}
