package ie.oireachtas.explorer.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import ie.oireachtas.explorer.data.api.OireachtasService
import ie.oireachtas.explorer.data.model.Bill
import ie.oireachtas.explorer.data.model.Debate
import ie.oireachtas.explorer.data.model.Member
import ie.oireachtas.explorer.ui.theme.PartyColors
import kotlinx.coroutines.launch

private enum class ResultType(val label: String) {
    ALL("All"), MEMBERS("Members"), DEBATES("Debates"), BILLS("Bills")
}

/**
 * Global search across loaded members and recent debates / bills for the
 * current chamber & house. Mirrors src/components/GlobalSearchPage.tsx —
 * client-side substring filter over a small preloaded sample. The
 * Oireachtas API does not expose a true full-text search so the same
 * approach is used here.
 *
 * Question search is intentionally deferred — getQuestions requires a
 * memberId at the API layer; adding global PQ search needs an API change.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlobalSearchScreen(
    chamber: String,
    houseNo: Int,
    allMembers: List<Member>,
    onBack: () -> Unit,
    onSelectMember: (Member) -> Unit,
    onSelectDebate: (Debate) -> Unit,
    onSelectBill: (billNo: String, billYear: String) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    var type by rememberSaveable { mutableStateOf(ResultType.ALL) }

    var debates by remember { mutableStateOf<List<Debate>>(emptyList()) }
    var bills by remember { mutableStateOf<List<Bill>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(chamber, houseNo) {
        loading = true
        scope.launch {
            runCatching {
                val chamberId = OireachtasService.houseUri(chamber, houseNo)
                val (d, _) = OireachtasService.getDebates(chamberId = chamberId, limit = 80, skip = 0)
                debates = d
            }
        }.invokeOnCompletion { /* ignore */ }
        scope.launch {
            runCatching {
                val chamberId = OireachtasService.houseUri(chamber, houseNo)
                val (b, _) = OireachtasService.getLegislation(chamberId = chamberId, limit = 120, skip = 0)
                bills = b
            }.also { loading = false }
        }
    }

    val term = query.trim().lowercase()
    val memberMatches = remember(allMembers, term) {
        if (term.isEmpty()) emptyList()
        else allMembers.filter {
            it.fullName.lowercase().contains(term) ||
                it.party.lowercase().contains(term) ||
                it.constituency.lowercase().contains(term) ||
                it.offices.any { o -> o.lowercase().contains(term) } ||
                it.committees.any { c -> c.name.lowercase().contains(term) }
        }.take(20)
    }
    val debateMatches = remember(debates, term) {
        if (term.isEmpty()) emptyList()
        else debates.filter {
            it.title.lowercase().contains(term) ||
                it.chamber.lowercase().contains(term) ||
                it.date.contains(term) ||
                it.sections.any { s -> s.title.lowercase().contains(term) }
        }.take(20)
    }
    val billMatches = remember(bills, term) {
        if (term.isEmpty()) emptyList()
        else bills.filter {
            it.title.lowercase().contains(term) ||
                (it.longTitleEn ?: "").lowercase().contains(term) ||
                it.status.lowercase().contains(term) ||
                it.sponsors.any { s -> s.lowercase().contains(term) }
        }.take(20)
    }

    val showMembers = type == ResultType.ALL || type == ResultType.MEMBERS
    val showDebates = type == ResultType.ALL || type == ResultType.DEBATES
    val showBills = type == ResultType.ALL || type == ResultType.BILLS

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Search") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                placeholder = { Text("Search names, topics, bills, parties…") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { /* filter is reactive */ }),
                shape = RoundedCornerShape(10.dp),
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ResultType.entries.forEach { rt ->
                    FilterChip(
                        selected = type == rt,
                        onClick = { type = rt },
                        label = { Text(rt.label) },
                    )
                }
            }

            when {
                term.isEmpty() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                    Text(
                        "Enter a term to search across the parliamentary record.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                loading && debates.isEmpty() && bills.isEmpty() -> Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                memberMatches.isEmpty() && debateMatches.isEmpty() && billMatches.isEmpty() -> Box(
                    Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center
                ) {
                    Text(
                        "No matches found in the currently loaded record sample.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (showMembers && memberMatches.isNotEmpty()) {
                        item { SectionHeading("Members", memberMatches.size) }
                        items(memberMatches, key = { "m:${it.uri}" }) { m ->
                            ResultCard(
                                title = m.fullName,
                                meta = listOfNotNull(m.party.takeIf { it.isNotBlank() }, m.constituency.takeIf { it.isNotBlank() }).joinToString(" · "),
                                accent = PartyColors.partyColor(m.party),
                                onClick = { onSelectMember(m) }
                            )
                        }
                    }
                    if (showDebates && debateMatches.isNotEmpty()) {
                        item { SectionHeading("Debates", debateMatches.size) }
                        items(debateMatches, key = { "d:${it.uri}" }) { d ->
                            ResultCard(
                                title = d.title,
                                meta = listOf(d.date, d.chamber).filter { it.isNotBlank() }.joinToString(" · "),
                                accent = MaterialTheme.colorScheme.primary,
                                onClick = { onSelectDebate(d) }
                            )
                        }
                    }
                    if (showBills && billMatches.isNotEmpty()) {
                        item { SectionHeading("Bills", billMatches.size) }
                        items(billMatches, key = { "b:${it.uri}" }) { b ->
                            ResultCard(
                                title = b.title,
                                meta = "Bill ${b.billNo} of ${b.billYear} · ${b.status}",
                                accent = MaterialTheme.colorScheme.secondary,
                                onClick = { onSelectBill(b.billNo, b.billYear) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeading(title: String, count: Int) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 4.dp),
    ) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Text("$count", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ResultCard(
    title: String,
    meta: String,
    accent: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(accent))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 2)
                if (meta.isNotBlank()) {
                    Text(meta, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
