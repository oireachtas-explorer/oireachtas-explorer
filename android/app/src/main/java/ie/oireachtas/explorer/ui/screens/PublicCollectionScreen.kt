package ie.oireachtas.explorer.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ie.oireachtas.explorer.data.collections.PublicCollection
import ie.oireachtas.explorer.data.collections.PublicCollections

/**
 * Read-only viewer for a public, share-by-link research collection.
 * Mirrors src/components/PublicCollectionPage.tsx.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicCollectionScreen(slug: String, onBack: () -> Unit) {
    var collection by remember { mutableStateOf<PublicCollection?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(slug) {
        loading = true
        error = null
        runCatching { PublicCollections.fetch(slug) }
            .onSuccess { collection = it }
            .onFailure { error = it.message ?: "Failed to load collection." }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(collection?.title ?: "Public collection") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        when {
            loading -> Box(Modifier.padding(padding).fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            error != null -> Box(Modifier.padding(padding).fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Text(error.orEmpty(), color = MaterialTheme.colorScheme.error)
            }
            collection != null -> {
                val c = collection!!
                LazyColumn(
                    modifier = Modifier.padding(padding).fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item {
                        Column {
                            if (!c.description.isNullOrBlank()) {
                                Text(c.description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                            }
                            Text("${c.itemCount} items · published ${c.createdAt.take(10)}",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    items(c.items, key = { it.id }) { item ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        ) {
                            Column(Modifier.padding(14.dp)) {
                                Text(item.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                item.subtitle?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                item.quote?.let {
                                    Spacer(Modifier.height(8.dp))
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
                        }
                    }
                }
            }
        }
    }
}
