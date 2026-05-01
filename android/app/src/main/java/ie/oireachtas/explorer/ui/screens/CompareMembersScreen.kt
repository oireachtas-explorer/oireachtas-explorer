package ie.oireachtas.explorer.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ie.oireachtas.explorer.data.api.OireachtasService
import ie.oireachtas.explorer.data.model.ActivitySummary
import ie.oireachtas.explorer.data.model.Member
import ie.oireachtas.explorer.data.model.VoteBreakdown
import ie.oireachtas.explorer.ui.components.MemberAvatar
import ie.oireachtas.explorer.ui.theme.OireachtasColors
import ie.oireachtas.explorer.ui.theme.PartyColors
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

/**
 * Side-by-side comparison of two members. Mirrors
 * src/components/CompareMembersPage.tsx — picks two from the loaded
 * member list, fetches each member's activity summary and vote
 * breakdown in parallel, then renders the metrics in two stacked
 * cards. On phones the layout is vertical; the visual structure
 * matches the web version's two columns.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompareMembersScreen(
    chamber: String,
    houseNo: Int,
    allMembers: List<Member>,
    onBack: () -> Unit,
) {
    var first by remember { mutableStateOf<Member?>(null) }
    var second by remember { mutableStateOf<Member?>(null) }
    var pickerSlot by remember { mutableStateOf<Int?>(null) }
    var firstSummary by remember { mutableStateOf<ActivitySummary?>(null) }
    var firstVotes by remember { mutableStateOf<VoteBreakdown?>(null) }
    var secondSummary by remember { mutableStateOf<ActivitySummary?>(null) }
    var secondVotes by remember { mutableStateOf<VoteBreakdown?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(first?.uri, second?.uri) {
        if (first == null && second == null) return@LaunchedEffect
        loading = true
        scope.launch {
            coroutineScope {
                val a = first?.let { m ->
                    async {
                        runCatching { OireachtasService.fetchActivitySummary(m.uri, chamber, houseNo) }.getOrNull() to
                            runCatching { OireachtasService.fetchVoteBreakdown(m.uri, chamber, houseNo) }.getOrNull()
                    }
                }
                val b = second?.let { m ->
                    async {
                        runCatching { OireachtasService.fetchActivitySummary(m.uri, chamber, houseNo) }.getOrNull() to
                            runCatching { OireachtasService.fetchVoteBreakdown(m.uri, chamber, houseNo) }.getOrNull()
                    }
                }
                a?.await()?.let { (s, v) -> firstSummary = s; firstVotes = v }
                b?.await()?.let { (s, v) -> secondSummary = s; secondVotes = v }
                loading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Compare members") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                CompareSlot(
                    label = "First member",
                    member = first,
                    summary = firstSummary,
                    votes = firstVotes,
                    onPick = { pickerSlot = 1 },
                    onClear = { first = null; firstSummary = null; firstVotes = null },
                )
            }
            item {
                CompareSlot(
                    label = "Second member",
                    member = second,
                    summary = secondSummary,
                    votes = secondVotes,
                    onPick = { pickerSlot = 2 },
                    onClear = { second = null; secondSummary = null; secondVotes = null },
                )
            }
            if (loading) {
                item {
                    Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
            }
        }
    }

    if (pickerSlot != null) {
        MemberPickerDialog(
            members = allMembers,
            onDismiss = { pickerSlot = null },
            onPick = { picked ->
                if (pickerSlot == 1) first = picked else second = picked
                pickerSlot = null
            }
        )
    }
}

@Composable
private fun CompareSlot(
    label: String,
    member: Member?,
    summary: ActivitySummary?,
    votes: VoteBreakdown?,
    onPick: () -> Unit,
    onClear: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            if (member == null) {
                OutlinedButton(onClick = onPick, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Choose member")
                }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MemberAvatar(member.photoUrl, member.fullName, size = 56.dp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(member.fullName, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Box(Modifier.size(8.dp).clip(CircleShape).background(PartyColors.partyColor(member.party)))
                            Text(member.party, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        }
                        if (member.constituency.isNotBlank()) {
                            Text(member.constituency, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    IconButton(onClick = onClear) {
                        Icon(Icons.Default.Close, contentDescription = "Remove $label")
                    }
                }

                Spacer(Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Stat(label = "Debates", value = summary?.totalDebates?.toString() ?: "—")
                    Stat(label = "Votes", value = summary?.totalVotes?.toString() ?: "—")
                    Stat(label = "Questions", value = summary?.totalQuestions?.toString() ?: "—")
                    Stat(label = "Bills", value = summary?.totalBills?.toString() ?: "—")
                }

                if (votes != null && (votes.ta + votes.nil + votes.staon) > 0) {
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(6.dp))) {
                        val total = (votes.ta + votes.nil + votes.staon).toFloat()
                        Box(Modifier.weight(votes.ta / total).fillMaxHeight().background(OireachtasColors.VoteFor))
                        Box(Modifier.weight(votes.nil / total).fillMaxHeight().background(OireachtasColors.VoteAgainst))
                        Box(Modifier.weight(votes.staon / total).fillMaxHeight().background(OireachtasColors.VoteAbstain))
                    }
                    Spacer(Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Tá ${votes.ta}", style = MaterialTheme.typography.labelSmall, color = OireachtasColors.VoteFor)
                        Text("Níl ${votes.nil}", style = MaterialTheme.typography.labelSmall, color = OireachtasColors.VoteAgainst)
                        Text("Staon ${votes.staon}", style = MaterialTheme.typography.labelSmall, color = OireachtasColors.VoteAbstain)
                    }
                }
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column {
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun MemberPickerDialog(
    members: List<Member>,
    onDismiss: () -> Unit,
    onPick: (Member) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(members, query) {
        if (query.isBlank()) members
        else members.filter {
            it.fullName.contains(query, ignoreCase = true) ||
                it.party.contains(query, ignoreCase = true) ||
                it.constituency.contains(query, ignoreCase = true)
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        title = { Text("Pick a member") },
        text = {
            Column(Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Filter by name, party, constituency") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                LazyColumn(
                    modifier = Modifier.heightIn(max = 360.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    items(filtered, key = { it.uri }) { m ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onPick(m) }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            MemberAvatar(m.photoUrl, m.fullName, size = 32.dp)
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(m.fullName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                Text(
                                    listOfNotNull(m.party.takeIf { it.isNotBlank() }, m.constituency.takeIf { it.isNotBlank() }).joinToString(" · "),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    )
}
