package ie.oireachtas.explorer

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ie.oireachtas.explorer.data.api.DailMetadata
import ie.oireachtas.explorer.data.model.ConstituencyItem
import ie.oireachtas.explorer.data.model.Debate
import ie.oireachtas.explorer.data.model.Member
import ie.oireachtas.explorer.ui.screens.*
import ie.oireachtas.explorer.ui.theme.OireachtasColors
import ie.oireachtas.explorer.ui.theme.OireachtasTheme
import ie.oireachtas.explorer.viewmodel.MainViewModel
import kotlinx.coroutines.flow.MutableStateFlow

class MainActivity : ComponentActivity() {
    private val pendingDeepLink = MutableStateFlow<Uri?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        captureDeepLink(intent)
        setContent {
            OireachtasTheme {
                OireachtasApp(pendingDeepLink)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        captureDeepLink(intent)
    }

    private fun captureDeepLink(intent: Intent?) {
        val data = intent?.data ?: return
        if (intent.action == Intent.ACTION_VIEW) pendingDeepLink.value = data
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OireachtasApp(pendingDeepLink: MutableStateFlow<Uri?>? = null) {
    val navController = rememberNavController()
    val viewModel: MainViewModel = viewModel()
    val uiState by viewModel.uiState.collectAsState()
    val memberProfile by viewModel.memberProfile.collectAsState()
    val debatesList by viewModel.debatesList.collectAsState()
    val transcript by viewModel.transcript.collectAsState()

    // Navigation selection state lives in the ViewModel so it survives
    // configuration changes (rotation, theme switch). See MainViewModel.
    val selectedConstituency by viewModel.selectedConstituency.collectAsState()
    val selectedDebate by viewModel.selectedDebate.collectAsState()
    val selectedPartyName by viewModel.selectedPartyName.collectAsState()
    val selectedCommitteeName by viewModel.selectedCommitteeName.collectAsState()

    // Dáil session picker state
    var showSessionPicker by remember { mutableStateOf(false) }
    val houseList = remember(uiState.chamber) { DailMetadata.houseList(uiState.chamber) }
    val chamberName = remember(uiState.chamber) { DailMetadata.chamberName(uiState.chamber) }

    // Shared navigation callbacks
    val navigateToMember: (String) -> Unit = { memberUri ->
        viewModel.loadMemberProfile(memberUri)
        navController.navigate("member_profile")
    }

    val navigateToDebate: (Debate) -> Unit = { debate ->
        viewModel.selectDebate(debate)
        val xmlUri = debate.xmlUri
        if (xmlUri != null) {
            viewModel.loadTranscript(xmlUri, debate.debateSectionUri)
            navController.navigate("debate_viewer")
        }
    }

    val navigateToParty: (String) -> Unit = { partyName ->
        viewModel.selectParty(partyName)
        navController.navigate("party_members")
    }

    val navigateToCommittee: (String) -> Unit = { committeeName ->
        viewModel.selectCommittee(committeeName)
        navController.navigate("committee_members")
    }

    // Handle deep links: oireachtas-explorer://member?uri=<encoded>
    // Triggered when launched/resumed via the ACTION_VIEW intent filter.
    val deepLink by (pendingDeepLink ?: remember { MutableStateFlow(null) }).collectAsState()
    LaunchedEffect(deepLink) {
        val uri = deepLink ?: return@LaunchedEffect
        when (uri.host) {
            "member" -> uri.getQueryParameter("uri")?.let { navigateToMember(it) }
        }
        pendingDeepLink?.value = null
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            // Header matching the web's green gradient bar
            Surface(
                shadowElevation = 4.dp,
                tonalElevation = 0.dp,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    OireachtasColors.Green900,
                                    OireachtasColors.Green800,
                                    OireachtasColors.Green700
                                )
                            )
                        )
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Title — clickable to go home
                        TextButton(
                            onClick = { navController.popBackStack("home", inclusive = false) },
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text(
                                text = "Oireachtas Explorer",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }

                        Spacer(Modifier.weight(1f))
                        
                        IconButton(onClick = { navController.navigate("about") }) {
                            Icon(
                                Icons.Default.Info,
                                contentDescription = "About",
                                tint = Color.White
                            )
                        }

                        // Chamber toggle
                        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                            listOf("dail" to "Dáil", "seanad" to "Seanad").forEach { (code, label) ->
                                val isActive = uiState.chamber == code
                                FilledTonalButton(
                                    onClick = { if (!isActive) viewModel.setChamber(code) },
                                    colors = ButtonDefaults.filledTonalButtonColors(
                                        containerColor = if (isActive) Color.White else Color.White.copy(alpha = 0.15f),
                                        contentColor = if (isActive) OireachtasColors.Green700 else Color.White
                                    ),
                                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                                    modifier = Modifier.height(32.dp)
                                ) {
                                    Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(6.dp))

                    // Session picker row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        ExposedDropdownMenuBox(
                            expanded = showSessionPicker,
                            onExpandedChange = { showSessionPicker = it }
                        ) {
                            OutlinedButton(
                                onClick = { showSessionPicker = true },
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = Color.White
                                ),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    Color.White.copy(alpha = 0.3f)
                                ),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                                modifier = Modifier
                                    .menuAnchor(MenuAnchorType.PrimaryNotEditable, true)
                                    .height(34.dp)
                            ) {
                                val isLatest = uiState.houseNo == DailMetadata.latestFor(uiState.chamber)
                                Text(
                                    "${uiState.houseNo}${if (isLatest) " (Current)" else ""} $chamberName",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            ExposedDropdownMenu(
                                expanded = showSessionPicker,
                                onDismissRequest = { showSessionPicker = false }
                            ) {
                                houseList.forEach { info ->
                                    val isLatest = info.houseNo == DailMetadata.latestFor(uiState.chamber)
                                    DropdownMenuItem(
                                        text = {
                                            Text(
                                                "${info.ordinal} $chamberName (${info.year})${if (isLatest) " — Current" else ""}",
                                                fontWeight = if (info.houseNo == uiState.houseNo) FontWeight.Bold else FontWeight.Normal
                                            )
                                        },
                                        onClick = {
                                            viewModel.setHouseNo(info.houseNo)
                                            showSessionPicker = false
                                            navController.popBackStack("home", inclusive = false)
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("home") {
                HomeScreen(
                    uiState = uiState,
                    onChamberChange = { viewModel.setChamber(it) },
                    onSelectConstituency = { constituency ->
                        viewModel.selectConstituency(constituency)
                        navController.navigate("members")
                    },
                    onGlobalDebates = {
                        viewModel.loadGlobalDebates()
                        navController.navigate("global_debates")
                    }
                )
            }

            composable("members") {
                val constName = selectedConstituency?.constituency?.name ?: ""
                val constCode = selectedConstituency?.constituency?.constituencyId ?: ""
                val members = remember(uiState.allMembers, constCode) {
                    uiState.allMembers.filter {
                        it.constituencyCode.equals(constCode, ignoreCase = true)
                    }
                }
                MembersScreen(
                    constituencyName = constName,
                    members = members,
                    loading = uiState.loadingMembers,
                    onBack = { navController.popBackStack() },
                    onSelectMember = { member -> navigateToMember(member.uri) }
                )
            }

            composable("member_profile") {
                MemberProfileScreen(
                    state = memberProfile,
                    chamber = uiState.chamber,
                    houseNo = uiState.houseNo,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() },
                    onDebateClick = navigateToDebate,
                    onMemberClick = navigateToMember,
                    onPartyClick = navigateToParty,
                    onCommitteeClick = navigateToCommittee,
                    onBillClick = { billNo, billYear ->
                        viewModel.loadBill(billNo, billYear)
                        navController.navigate("bill_viewer/$billYear/$billNo")
                    }
                )
            }

            composable("bill_viewer/{billYear}/{billNo}") { backStackEntry ->
                val billYear = backStackEntry.arguments?.getString("billYear") ?: ""
                val billNo = backStackEntry.arguments?.getString("billNo") ?: ""
                val billViewerState by viewModel.billViewer.collectAsStateWithLifecycle()
                
                BillViewerScreen(
                    billNo = billNo,
                    billYear = billYear,
                    billState = billViewerState.bill,
                    loading = billViewerState.loading,
                    error = billViewerState.error,
                    onBack = { navController.popBackStack() }
                )
            }

            composable("debate_viewer") {
                DebateViewerScreen(
                    title = selectedDebate?.title ?: "Debate",
                    transcriptState = transcript,
                    onBack = {
                        viewModel.clearTranscript()
                        navController.popBackStack()
                    },
                    onSpeakerClick = { memberUri -> navigateToMember(memberUri) }
                )
            }

            composable("global_debates") {
                GlobalDebatesScreen(
                    state = debatesList,
                    onBack = { navController.popBackStack() },
                    onDebateClick = navigateToDebate,
                    onLoadMore = { skip -> viewModel.loadGlobalDebates(skip = skip) }
                )
            }

            composable("party_members") {
                val partyMembers = remember(uiState.allMembers, selectedPartyName) {
                    uiState.allMembers.filter { it.party == selectedPartyName }
                }
                MembersScreen(
                    constituencyName = "$selectedPartyName ${DailMetadata.memberNoun(uiState.chamber, true)}",
                    members = partyMembers,
                    loading = uiState.loadingMembers,
                    onBack = { navController.popBackStack() },
                    onSelectMember = { member -> navigateToMember(member.uri) }
                )
            }

            composable("committee_members") {
                val committeeMembers = remember(uiState.allMembers, selectedCommitteeName) {
                    uiState.allMembers.filter { member ->
                        member.committees.any { it.name == selectedCommitteeName }
                    }
                }
                MembersScreen(
                    constituencyName = selectedCommitteeName,
                    members = committeeMembers,
                    loading = uiState.loadingMembers,
                    onBack = { navController.popBackStack() },
                    onSelectMember = { member -> navigateToMember(member.uri) }
                )
            }
            
            composable("about") {
                AboutScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
