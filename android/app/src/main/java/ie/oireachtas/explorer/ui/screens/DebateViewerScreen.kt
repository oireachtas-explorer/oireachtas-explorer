package ie.oireachtas.explorer.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.fromHtml
import androidx.compose.animation.animateContentSize
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import ie.oireachtas.explorer.data.model.SpeechSegment
import ie.oireachtas.explorer.ui.components.ErrorMessage
import ie.oireachtas.explorer.ui.components.LoadingIndicator
import ie.oireachtas.explorer.ui.components.MemberAvatar
import ie.oireachtas.explorer.viewmodel.TranscriptState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DebateViewerScreen(
    title: String,
    transcriptState: TranscriptState,
    onBack: () -> Unit,
    onSpeakerClick: ((String) -> Unit)? = null
) {
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(title, maxLines = 1) },
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
            transcriptState.loading -> LoadingIndicator()
            transcriptState.error != null -> ErrorMessage("Failed to load transcript: ${transcriptState.error}")
            transcriptState.segments.isEmpty() -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "No transcript content available.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            else -> {
                // Participants summary
                val uniqueSpeakers = transcriptState.segments.map { it.speakerName }.distinct()
                if (uniqueSpeakers.isNotEmpty()) {
                    var participantsExpanded by remember { mutableStateOf(false) }
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                            .clickable { participantsExpanded = !participantsExpanded }
                            .animateContentSize(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Participants (${uniqueSpeakers.size})", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                                Icon(
                                    if (participantsExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    contentDescription = if (participantsExpanded) "Collapse" else "Expand"
                                )
                            }
                            if (participantsExpanded) {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    uniqueSpeakers.joinToString(", "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(transcriptState.segments) { segment ->
                        SpeechCard(segment, onSpeakerClick)
                    }
                }
            }
        }
    }
}

@Composable
private fun SpeechCard(segment: SpeechSegment, onSpeakerClick: ((String) -> Unit)?) {
    val memberUri = segment.memberUri
    val photoUrl = memberUri?.let { "$it/image/thumb" }
    val isClickable = memberUri != null && onSpeakerClick != null

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Clickable avatar → navigate to member profile
        MemberAvatar(
            photoUrl = photoUrl,
            fullName = segment.speakerName,
            size = 44.dp,
            modifier = if (isClickable) Modifier.clickable { onSpeakerClick?.invoke(memberUri!!) } else Modifier
        )

        Column(modifier = Modifier.weight(1f)) {
            // Clickable speaker name → navigate to member profile
            Text(
                segment.speakerName,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = if (isClickable) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                textDecoration = if (isClickable) TextDecoration.Underline else TextDecoration.None,
                modifier = if (isClickable) Modifier.clickable { onSpeakerClick?.invoke(memberUri!!) } else Modifier
            )
            Spacer(Modifier.height(4.dp))
            segment.paragraphs.forEach { para ->
                Text(
                    // Render bold/italic/etc. preserved by the XML parser.
                    // Plain-text paragraphs render identically.
                    AnnotatedString.fromHtml(para),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }
        }
    }
    HorizontalDivider(modifier = Modifier.padding(top = 8.dp))
}
