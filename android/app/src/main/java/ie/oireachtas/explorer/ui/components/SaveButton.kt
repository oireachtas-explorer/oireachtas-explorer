package ie.oireachtas.explorer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import ie.oireachtas.explorer.data.saved.SavedItem
import ie.oireachtas.explorer.data.saved.SavedItemsRepository

/**
 * Mirrors src/components/SaveButton.tsx — a toggle that adds/removes the
 * given [item] from the local saved-items collection and re-renders when
 * the underlying repository changes.
 */
@Composable
fun SaveButton(item: SavedItem, modifier: Modifier = Modifier) {
    val items by SavedItemsRepository.items.collectAsState()
    val saved = items.any { it.id == item.id }

    if (saved) {
        FilledTonalButton(
            onClick = { SavedItemsRepository.toggle(item) },
            colors = ButtonDefaults.filledTonalButtonColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
            ),
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
            modifier = modifier.height(36.dp),
        ) {
            Icon(Icons.Default.Bookmark, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text("Saved")
        }
    } else {
        OutlinedButton(
            onClick = { SavedItemsRepository.toggle(item) },
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
            modifier = modifier.height(36.dp),
        ) {
            Icon(Icons.Outlined.BookmarkBorder, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text("Save")
        }
    }
}
