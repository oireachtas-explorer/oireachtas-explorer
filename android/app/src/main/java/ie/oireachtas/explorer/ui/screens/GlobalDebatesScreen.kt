package ie.oireachtas.explorer.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ie.oireachtas.explorer.data.model.Debate
import ie.oireachtas.explorer.ui.components.DebateCard
import ie.oireachtas.explorer.ui.components.LoadingIndicator
import ie.oireachtas.explorer.viewmodel.DebatesListState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlobalDebatesScreen(
    state: DebatesListState,
    onBack: () -> Unit,
    onDebateClick: (Debate) -> Unit,
    onLoadMore: (Int) -> Unit
) {
    val listState = rememberLazyListState()

    // Trigger load more when near the end
    val shouldLoadMore by remember {
        derivedStateOf {
            val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            lastVisible >= state.debates.size - 3 && !state.loading && state.debates.size < state.total
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore) onLoadMore(state.debates.size)
    }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text("All Debates") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        if (state.loading && state.debates.isEmpty()) {
            LoadingIndicator()
        } else {
            LazyColumn(
                state = listState,
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.debates) { debate ->
                    DebateCard(debate, onClick = { onDebateClick(debate) })
                }
                if (state.loading) {
                    item { LoadingIndicator() }
                }
            }
        }
    }
}
