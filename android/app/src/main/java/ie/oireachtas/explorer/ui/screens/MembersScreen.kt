package ie.oireachtas.explorer.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ie.oireachtas.explorer.data.model.Member
import ie.oireachtas.explorer.ui.components.LoadingIndicator
import ie.oireachtas.explorer.ui.components.MemberCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MembersScreen(
    constituencyName: String,
    members: List<Member>,
    loading: Boolean,
    onBack: () -> Unit,
    onSelectMember: (Member) -> Unit
) {
    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(constituencyName) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        if (loading) {
            LoadingIndicator()
        } else if (members.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(32.dp)) {
                Text(
                    "No members found for this constituency.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(members) { member ->
                    MemberCard(member = member, onClick = { onSelectMember(member) })
                }
            }
        }
    }
}
