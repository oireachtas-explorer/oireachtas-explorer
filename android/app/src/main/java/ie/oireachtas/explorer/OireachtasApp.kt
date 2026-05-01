package ie.oireachtas.explorer

import android.app.Application
import ie.oireachtas.explorer.data.api.OireachtasService
import ie.oireachtas.explorer.data.saved.SavedItemsRepository

class OireachtasApp : Application() {
    override fun onCreate() {
        super.onCreate()
        OireachtasService.init(this)
        SavedItemsRepository.init(this)
    }
}
