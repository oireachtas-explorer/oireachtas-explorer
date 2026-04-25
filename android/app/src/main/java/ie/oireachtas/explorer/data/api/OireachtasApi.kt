package ie.oireachtas.explorer.data.api

import ie.oireachtas.explorer.data.model.*
import retrofit2.http.GET
import retrofit2.http.Query

interface OireachtasApi {

    @GET("constituencies")
    suspend fun getConstituencies(
        @Query("chamber") chamber: String,
        @Query("house_no") houseNo: Int,
        @Query("limit") limit: Int = 200
    ): ConstituencyResult

    @GET("members")
    suspend fun getMembers(
        @Query("chamber") chamber: String,
        @Query("house_no") houseNo: Int,
        @Query("const_code") constCode: String? = null,
        @Query("member_id") memberId: String? = null,
        @Query("limit") limit: Int = 500
    ): MemberResult

    @GET("debates")
    suspend fun getDebates(
        @Query("member_id") memberId: String? = null,
        @Query("chamber_id") chamberId: String? = null,
        @Query("chamber_type") chamberType: String? = null,
        @Query("date_start") dateStart: String? = null,
        @Query("date_end") dateEnd: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("skip") skip: Int = 0
    ): DebateResult

    @GET("divisions")
    suspend fun getDivisions(
        @Query("member_id") memberId: String? = null,
        @Query("chamber_id") chamberId: String? = null,
        @Query("limit") limit: Int = 50,
        @Query("skip") skip: Int = 0
    ): DivisionResult

    @GET("questions")
    suspend fun getQuestions(
        @Query("member_id") memberId: String,
        @Query("qtype") qtype: String = "oral,written",
        @Query("date_start") dateStart: String? = null,
        @Query("date_end") dateEnd: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("skip") skip: Int = 0
    ): QuestionResult

    @GET("legislation")
    suspend fun getLegislation(
        @Query("member_id") memberId: String? = null,
        @Query("chamber_id") chamberId: String? = null,
        @Query("bill_no") billNo: String? = null,
        @Query("bill_year") billYear: String? = null,
        @Query("limit") limit: Int = 20,
        @Query("skip") skip: Int = 0
    ): LegislationResult
}
