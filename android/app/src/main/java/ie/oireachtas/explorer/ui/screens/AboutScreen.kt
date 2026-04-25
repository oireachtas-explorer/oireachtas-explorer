package ie.oireachtas.explorer.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import ie.oireachtas.explorer.ui.theme.OireachtasColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("About & Licences") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                    navigationIconContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                text = "Oireachtas Explorer",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = OireachtasColors.Green800
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "A tool to explore the activity of the Houses of the Oireachtas.",
                style = MaterialTheme.typography.bodyLarge
            )

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Data Attribution & Licensing",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "The parliamentary data displayed in this application is created by and belongs to the Houses of the Oireachtas.",
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "© Houses of the Oireachtas",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Data is re-used under the terms of the Oireachtas (Open Data) PSI Licence, which incorporates the Creative Commons Attribution 4.0 International License.",
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "View the Oireachtas Open Data PSI Licence",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.primary,
                    textDecoration = TextDecoration.Underline
                ),
                modifier = Modifier.clickable {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.oireachtas.ie/en/open-data/license/"))
                    context.startActivity(intent)
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Privacy Policy",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "View the App Privacy Policy",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.primary,
                    textDecoration = TextDecoration.Underline
                ),
                modifier = Modifier.clickable {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://oireachtas-explorer.github.io/oireachtas-explorer/privacy.html"))
                    context.startActivity(intent)
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Disclaimer of Warranties",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "The Licensed Material is provided by the Houses of the Oireachtas on an \"AS IS\" and \"AS AVAILABLE\" basis, without representations or warranties of any kind, either express, implied, statutory, or other. This includes, without limitation, warranties of title, merchantability, fitness for a particular purpose, non-infringement, absence of latent or other defects, accuracy, or the presence or absence of errors, whether or not known or discoverable.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
