package com.vcp.mobile

import android.content.Intent
import android.net.Uri

internal fun multiPickerIntent(mode: String): Intent {
    require(mode == "gallery" || mode == "file") { "Multiple selection supports gallery or file only" }
    return Intent(Intent.ACTION_GET_CONTENT).apply {
        type = if (mode == "gallery") "image/*" else "*/*"
        addCategory(Intent.CATEGORY_OPENABLE)
        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
    }
}

internal fun selectedPickerUris(intent: Intent?): List<Uri> {
    val ordered = linkedSetOf<Uri>()
    intent?.clipData?.let { clips ->
        for (index in 0 until clips.itemCount) clips.getItemAt(index).uri?.let { ordered.add(it) }
    }
    intent?.data?.let { ordered.add(it) }
    return ordered.toList()
}
