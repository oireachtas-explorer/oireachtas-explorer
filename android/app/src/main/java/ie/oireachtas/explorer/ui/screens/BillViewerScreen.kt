package ie.oireachtas.explorer.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ie.oireachtas.explorer.data.model.Bill
import ie.oireachtas.explorer.data.model.BillDocument
import ie.oireachtas.explorer.ui.components.ErrorMessage
import ie.oireachtas.explorer.ui.components.LoadingIndicator
import ie.oireachtas.explorer.ui.components.SectionHeader
import ie.oireachtas.explorer.ui.theme.OireachtasColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillViewerScreen(
    billNo: String,
    billYear: String,
    billState: Bill?,
    loading: Boolean,
    error: String?,
    onBack: () -> Unit
) {
    val context = LocalContext.current

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("Bill $billNo/$billYear") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        when {
            loading -> LoadingIndicator()
            error != null -> ErrorMessage(error)
            billState == null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Bill not found.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        BillHeaderCard(billState)
                    }

                    item {
                        BillDetailsCard(billState)
                    }

                    item {
                        SectionHeader("Official Documents")
                        val mainDocUrl = billState.versions.firstOrNull()?.pdfUri ?: billState.relatedDocs.firstOrNull()?.pdfUri
                        if (mainDocUrl != null) {
                            Button(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(mainDocUrl))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                            ) {
                                Icon(Icons.Default.Description, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Open Latest PDF")
                            }
                        } else {
                            Text("No main PDF available.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    if (billState.versions.isNotEmpty()) {
                        item {
                            SectionHeader("Versions")
                        }
                        items(billState.versions) { doc ->
                            DocumentRow(doc)
                        }
                    }

                    if (billState.relatedDocs.isNotEmpty()) {
                        item {
                            SectionHeader("Related Documents")
                        }
                        items(billState.relatedDocs) { doc ->
                            DocumentRow(doc)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BillHeaderCard(bill: Bill) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(1.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val sc = when (bill.status.lowercase()) {
                    "enacted" -> OireachtasColors.VoteFor
                    "current", "published" -> MaterialTheme.colorScheme.primary
                    "defeated", "rejected" -> OireachtasColors.VoteAgainst
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                }
                Text(
                    text = bill.status,
                    style = MaterialTheme.typography.labelSmall,
                    color = sc,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .background(sc.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )
                Text(
                    text = "${bill.source} • Bill ${bill.billNo} of ${bill.billYear}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                text = bill.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                lineHeight = 28.sp
            )
        }
    }
}

@Composable
private fun BillDetailsCard(bill: Bill) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            DetailRow("Origin House", bill.originHouse)
            DetailRow("Current Stage", bill.currentStage)
            DetailRow("Last Updated", bill.lastUpdated ?: "—")
            if (bill.sponsors.isNotEmpty()) {
                DetailRow("Sponsors", bill.sponsors.joinToString(", "))
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f, fill = false))
    }
}

@Composable
private fun DocumentRow(doc: BillDocument) {
    val context = LocalContext.current
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        elevation = CardDefaults.cardElevation(1.dp),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(doc.title, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                if (doc.date != null) {
                    Text(doc.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (doc.pdfUri != null) {
                TextButton(
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(doc.pdfUri))
                        context.startActivity(intent)
                    },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("PDF")
                }
            }
        }
    }
}
