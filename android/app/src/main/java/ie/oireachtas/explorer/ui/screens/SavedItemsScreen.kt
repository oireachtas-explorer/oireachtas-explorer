package ie.oireachtas.explorer.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.filled.RadioButtonChecked
import androidx.compose.ui.text.input.ImeAction
import ie.oireachtas.explorer.data.collections.PublicCollection
import ie.oireachtas.explorer.data.collections.PublicCollections
import ie.oireachtas.explorer.data.collections.PublishCollectionInput
import ie.oireachtas.explorer.data.saved.SavedItem
import ie.oireachtas.explorer.data.saved.SavedItemType
import ie.oireachtas.explorer.data.saved.SavedItemsRepository
import kotlinx.coroutines.launch

private fun typeLabel(t: SavedItemType): String = when (t) {
    SavedItemType.speech -> "Transcript passage"
    SavedItemType.bill -> "Bill"
    SavedItemType.debate -> "Debate"
    SavedItemType.member -> "Member"
    SavedItemType.question -> "Question"
}

private fun markdownEscape(s: String) = s.replace("[", "\\[").replace("]", "\\]")

/** Mirrors buildResearchDossier in SavedItemsPage.tsx. */
internal fun buildResearchDossier(items: List<SavedItem>): String {
    val now = java.text.SimpleDateFormat("d MMM yyyy, HH:mm", java.util.Locale("en", "IE")).format(java.util.Date())
    val sb = StringBuilder()
    sb.appendLine("# Oireachtas Explorer Research Dossier").appendLine()
    sb.appendLine("Generated: $now").appendLine()
    for (item in items) {
        sb.appendLine("## ${markdownEscape(item.title)}").appendLine()
        sb.appendLine("- Type: ${typeLabel(item.type)}")
        sb.appendLine("- Saved: ${item.savedAt}")
        item.sourceDate?.let { sb.appendLine("- Source date: $it") }
        item.subtitle?.let { sb.appendLine("- Context: $it") }
        item.citation?.let { sb.appendLine("- Citation: $it") }
        item.quote?.let {
            sb.appendLine()
            sb.appendLine("> " + it.replace("\n", "\n> "))
        }
        sb.appendLine()
    }
    return sb.toString()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SavedItemsScreen(onBack: () -> Unit) {
    val items by SavedItemsRepository.items.collectAsState()
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var publishTitle by remember { mutableStateOf("Research collection") }
    var publishDescription by remember { mutableStateOf("") }
    var publishing by remember { mutableStateOf(false) }
    var publishError by remember { mutableStateOf<String?>(null) }
    var published by remember { mutableStateOf<PublicCollection?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Saved Items", style = MaterialTheme.typography.headlineSmall) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (items.isNotEmpty()) {
                        IconButton(onClick = {
                            val send = Intent(Intent.ACTION_SEND).apply {
                                type = "text/markdown"
                                putExtra(Intent.EXTRA_SUBJECT, "Oireachtas Research Dossier")
                                putExtra(Intent.EXTRA_TEXT, buildResearchDossier(items))
                            }
                            ctx.startActivity(Intent.createChooser(send, "Share dossier"))
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "Share dossier")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (items.isEmpty()) {
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(Icons.Default.Bookmark, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.outline)
                Spacer(Modifier.height(12.dp))
                Text(
                    "No saved items yet. Use Save on members, debates, speeches, and bills.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.padding(padding).fillMaxSize(),
            ) {
                item {
                    PublishPanel(
                        itemCount = items.size,
                        title = publishTitle,
                        onTitleChange = { publishTitle = it },
                        description = publishDescription,
                        onDescriptionChange = { publishDescription = it },
                        publishing = publishing,
                        published = published,
                        publishError = publishError,
                        onPublish = {
                            publishing = true
                            publishError = null
                            published = null
                            scope.launch {
                                runCatching {
                                    PublicCollections.publish(
                                        PublishCollectionInput(
                                            title = publishTitle.trim(),
                                            description = publishDescription.takeIf { it.isNotBlank() },
                                            items = items,
                                        )
                                    )
                                }.onSuccess { published = it }
                                    .onFailure { publishError = it.message ?: "Unable to publish." }
                                publishing = false
                            }
                        },
                        onCopyLink = { url ->
                            val send = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, url)
                            }
                            ctx.startActivity(Intent.createChooser(send, "Share collection link"))
                        }
                    )
                }
                items(items, key = { it.id }) { item ->
                    SavedItemCard(item, onRemove = { SavedItemsRepository.remove(item.id) })
                }
            }
        }
    }
}

@Composable
private fun PublishPanel(
    itemCount: Int,
    title: String,
    onTitleChange: (String) -> Unit,
    description: String,
    onDescriptionChange: (String) -> Unit,
    publishing: Boolean,
    published: PublicCollection?,
    publishError: String?,
    onPublish: () -> Unit,
    onCopyLink: (String) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text("Publish a public collection", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text("$itemCount items", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "Share this dossier as a read-only public link backed by Cloudflare Workers KV.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (!PublicCollections.isEnabled()) {
                Spacer(Modifier.height(10.dp))
                Text(
                    "This build does not have a Worker URL configured, so publishing is unavailable.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
                return@Column
            }

            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = title, onValueChange = onTitleChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Collection title") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = description, onValueChange = onDescriptionChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Description (optional)") },
                minLines = 2, maxLines = 4,
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onPublish,
                enabled = !publishing && itemCount > 0 && title.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (publishing) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    Spacer(Modifier.width(8.dp))
                    Text("Publishing…")
                } else {
                    Icon(Icons.Default.RadioButtonChecked, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Publish collection")
                }
            }
            if (publishError != null) {
                Spacer(Modifier.height(8.dp))
                Text(publishError, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            if (published != null) {
                Spacer(Modifier.height(10.dp))
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(8.dp),
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text("Published", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text(published.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(4.dp))
                        val shareUrl = "oireachtas-explorer://collection?slug=${published.slug}"
                        Text(shareUrl, style = MaterialTheme.typography.labelSmall)
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(onClick = { onCopyLink(shareUrl) }) {
                            Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Share link")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SavedItemCard(item: SavedItem, onRemove: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(100.dp),
                    ) {
                        Text(
                            typeLabel(item.type),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Spacer(Modifier.height(6.dp))
                Text(item.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                item.subtitle?.let {
                    Spacer(Modifier.height(2.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                item.citation?.let {
                    Spacer(Modifier.height(2.dp))
                    Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                item.quote?.let {
                    Spacer(Modifier.height(6.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Text(
                            it,
                            modifier = Modifier.padding(10.dp),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Delete, contentDescription = "Remove ${item.title}")
            }
        }
    }
}

