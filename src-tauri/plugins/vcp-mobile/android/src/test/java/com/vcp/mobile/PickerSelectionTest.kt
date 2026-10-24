package com.vcp.mobile

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class PickerSelectionTest {
    @Test fun galleryAndFileRequestMultipleOpenableContent() {
        for ((mode, mime) in listOf("gallery" to "image/*", "file" to "*/*")) {
            val intent = multiPickerIntent(mode)
            assertEquals(Intent.ACTION_GET_CONTENT, intent.action)
            assertEquals(mime, intent.type)
            assertTrue(intent.hasCategory(Intent.CATEGORY_OPENABLE))
            assertTrue(intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, false))
        }
    }

    @Test fun clipDataOrderIsStableAndDataFallbackDoesNotDuplicate() {
        val first = Uri.parse("content://test/first")
        val second = Uri.parse("content://test/second")
        val clips = ClipData.newRawUri("files", first).apply {
            addItem(ClipData.Item(second))
            addItem(ClipData.Item(first))
            addItem(ClipData.Item("not a URI"))
        }
        assertEquals(listOf(first, second), selectedPickerUris(Intent().apply {
            clipData = clips
            data = first
        }))
    }

    @Test fun singleItemProvidersAndEmptyResultsAreSupported() {
        val uri = Uri.parse("content://test/only")
        assertEquals(listOf(uri), selectedPickerUris(Intent().setData(uri)))
        assertTrue(selectedPickerUris(null).isEmpty())
        assertTrue(selectedPickerUris(Intent()).isEmpty())
    }

    @Test(expected = IllegalArgumentException::class)
    fun avatarMustRemainSingleSelection() { multiPickerIntent("avatar") }
}
