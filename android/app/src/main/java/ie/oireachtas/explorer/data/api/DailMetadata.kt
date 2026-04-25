package ie.oireachtas.explorer.data.api

/**
 * Dáil / Seanad metadata: session numbers, years, date ranges, labels.
 * Mirrors the web version's dail.ts utilities.
 */
object DailMetadata {

    val DAIL_YEARS: Map<Int, Int> = mapOf(
        1 to 1919, 2 to 1921, 3 to 1922, 4 to 1923, 5 to 1927, 6 to 1927,
        7 to 1932, 8 to 1933, 9 to 1937, 10 to 1938, 11 to 1943, 12 to 1944,
        13 to 1948, 14 to 1951, 15 to 1954, 16 to 1957, 17 to 1961, 18 to 1965,
        19 to 1969, 20 to 1973, 21 to 1977, 22 to 1981, 23 to 1982, 24 to 1982,
        25 to 1987, 26 to 1989, 27 to 1992, 28 to 1997, 29 to 2002, 30 to 2007,
        31 to 2011, 32 to 2016, 33 to 2020, 34 to 2024,
    )

    const val LATEST_DAIL = 34

    // Seanad N sits alongside Dáil (N + 7). The 27th Seanad followed the 34th Dáil.
    private const val SEANAD_DAIL_OFFSET = 7
    val LATEST_SEANAD = LATEST_DAIL - SEANAD_DAIL_OFFSET

    val SEANAD_YEARS: Map<Int, Int> = DAIL_YEARS.entries
        .map { (d, year) -> (d - SEANAD_DAIL_OFFSET) to year }
        .filter { it.first >= 1 }
        .toMap()

    private fun yearsFor(chamber: String): Map<Int, Int> =
        if (chamber == "seanad") SEANAD_YEARS else DAIL_YEARS

    fun latestFor(chamber: String): Int =
        if (chamber == "seanad") LATEST_SEANAD else LATEST_DAIL

    fun getHouseDateRange(chamber: String, houseNo: Int): Pair<String, String> {
        val years = yearsFor(chamber)
        val latest = latestFor(chamber)
        val start = years[houseNo] ?: 1919
        val end = if (houseNo < latest) (years[houseNo + 1] ?: 2100) else 2100
        return "$start-01-01" to "$end-12-31"
    }

    data class HouseInfo(
        val houseNo: Int,
        val ordinal: String,
        val year: Int
    )

    private fun ordinal(n: Int): String {
        val suffix = when {
            n % 10 == 1 && n != 11 -> "st"
            n % 10 == 2 && n != 12 -> "nd"
            n % 10 == 3 && n != 13 -> "rd"
            else -> "th"
        }
        return "$n$suffix"
    }

    fun houseList(chamber: String): List<HouseInfo> {
        val years = yearsFor(chamber)
        val latest = latestFor(chamber)
        return (latest downTo 1).map { n ->
            HouseInfo(n, ordinal(n), years[n] ?: 0)
        }
    }

    fun chamberName(chamber: String): String =
        if (chamber == "seanad") "Seanad" else "Dáil"

    fun memberNoun(chamber: String, plural: Boolean = false): String =
        if (chamber == "seanad") {
            if (plural) "Senators" else "Senator"
        } else {
            if (plural) "TDs" else "TD"
        }

    fun houseLabel(chamber: String, houseNo: Int): String =
        "${ordinal(houseNo)} ${chamberName(chamber)}"

    fun houseLabelFull(chamber: String, houseNo: Int): String {
        val year = yearsFor(chamber)[houseNo]
        return if (year != null) "${houseLabel(chamber, houseNo)} ($year)" else houseLabel(chamber, houseNo)
    }
}
