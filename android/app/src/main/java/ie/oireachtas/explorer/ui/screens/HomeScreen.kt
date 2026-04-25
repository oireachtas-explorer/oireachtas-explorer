package ie.oireachtas.explorer.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ie.oireachtas.explorer.data.api.DailMetadata
import ie.oireachtas.explorer.data.model.ConstituencyItem
import ie.oireachtas.explorer.data.model.Member
import ie.oireachtas.explorer.ui.components.ErrorMessage
import ie.oireachtas.explorer.ui.components.LoadingIndicator
import ie.oireachtas.explorer.ui.theme.OireachtasColors
import ie.oireachtas.explorer.ui.theme.PartyColors
import ie.oireachtas.explorer.viewmodel.MainUiState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun HomeScreen(
    uiState: MainUiState,
    onChamberChange: (String) -> Unit,
    onSelectConstituency: (ConstituencyItem) -> Unit,
    onGlobalDebates: () -> Unit
) {
    var search by remember { mutableStateOf("") }
    val chamberName = remember(uiState.chamber) { DailMetadata.chamberName(uiState.chamber) }
    val groupLabel = if (uiState.chamber == "seanad") "Panels" else "Constituencies"
    val memberNoun = remember(uiState.chamber) { DailMetadata.memberNoun(uiState.chamber, true) }

    val filtered = remember(uiState.constituencies, search) {
        if (search.isBlank()) uiState.constituencies
        else uiState.constituencies.filter {
            it.constituency.name.contains(search, ignoreCase = true)
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // ── Stats row ────────────────────────────────────────────────
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(20.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatBox(
                    value = if (uiState.loadingConstituencies) "…" else "${uiState.constituencies.size}",
                    label = groupLabel
                )
                StatBox(
                    value = if (uiState.loadingMembers) "…" else "${uiState.allMembers.size}",
                    label = memberNoun
                )
                StatBox(
                    value = DailMetadata.houseLabelFull(uiState.chamber, uiState.houseNo).split(" ")[0],
                    label = chamberName
                )
            }
        }

        // ── Party Breakdown ──────────────────────────────────────────
        if (!uiState.loadingMembers && uiState.allMembers.isNotEmpty()) {
            item {
                PartyBreakdownCard(members = uiState.allMembers)
            }
        }

        // ── Search box ───────────────────────────────────────────────
        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search ${groupLabel.lowercase()}…") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline
                )
            )
        }

        // ── Constituency List ────────────────────────────────────────
        when {
            uiState.loadingConstituencies -> item { LoadingIndicator() }
            uiState.error != null -> item { ErrorMessage(uiState.error ?: "Error") }
            filtered.isEmpty() -> item {
                Text(
                    "No ${groupLabel.lowercase()} match \"$search\"",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(16.dp)
                )
            }
            else -> items(filtered) { item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectConstituency(item) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(1.dp),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            item.constituency.name,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(
                            Icons.Default.Search,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }

        // ── Debates link card ────────────────────────────────────────
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(1.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "$chamberName Debates Index",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Read official transcripts from recent plenary and committee debates.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedButton(
                        onClick = onGlobalDebates,
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Text("Browse All Debates", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatBox(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            value,
            fontSize = 22.sp,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.primary,
            letterSpacing = (-0.5).sp
        )
        Text(
            label.uppercase(),
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            letterSpacing = 0.8.sp
        )
    }
}

// ── Party Breakdown Card ──────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PartyBreakdownCard(members: List<Member>) {
    val partyCounts = remember(members) {
        members.groupBy { it.party }
            .mapValues { it.value.size }
            .entries
            .sortedByDescending { it.value }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(1.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "Party Composition",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "${members.size} seats",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(Modifier.height(12.dp))

            // Stacked bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(28.dp)
                    .clip(RoundedCornerShape(8.dp))
            ) {
                partyCounts.forEach { (party, count) ->
                    val fraction = count.toFloat() / members.size
                    Box(
                        modifier = Modifier
                            .weight(fraction)
                            .fillMaxHeight()
                            .background(PartyColors.partyColor(party)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (fraction > 0.08f) {
                            Text(
                                "$count",
                                color = androidx.compose.ui.graphics.Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Legend
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                partyCounts.forEach { (party, count) ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(PartyColors.partyColor(party))
                        )
                        Text(
                            party,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            "$count",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }
    }
}
