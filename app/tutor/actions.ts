"use server";

import sharp from "sharp";
import FormData from "form-data";
import fetch from "node-fetch";

export async function uploadBannerServer(file: File, username: string) {
  try {
    // Read the File into a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compress and convert to JPEG
    let compressedBuffer = await sharp(buffer)
      .resize({ width: 1920 })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Further compress if >1MB
    if (compressedBuffer.length > 1024 * 1024) {
      compressedBuffer = await sharp(compressedBuffer)
        .jpeg({ quality: 60 })
        .toBuffer();
    }

    // Use Node FormData
    const formData = new FormData();
    formData.append("file", compressedBuffer, {
      filename: `${username}.jpg`,
      contentType: "image/jpeg",
      knownLength: compressedBuffer.length,
    });

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData as any,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      console.error("Upload failed with status:", response.status);
      return { success: false, error: "Failed to upload banner" };
    }

    const data: any = await response.json();
    if(data.success) {
      return { success: true, data: data.data };
    } else {
      return { success: false, error: `Failed with status: ${data.status}`}
    }
  } catch (error) {
    console.error("Banner upload error:", error);
    return { success: false, error: "Failed to compress or upload banner" };
  }

}


export async function getOffers(userId: string | undefined) {
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/getSubjects?userId=${userId}`,
    {
      method: "GET",
    }
  );
  const data: any = await response.json();

  if (data.success) {
    return { success: true, data: data.data };
  } else {
    console.error("Error get offers:", data.error);
    return { success: false, error: "Failed to get offers" };
  }
}

export async function getOffer(
  userId: string | undefined,
  subjectId: string | undefined
) {
  if (!userId || !subjectId) {
    return { success: false, error: "Unauthorized" };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/getSubject?userId=${userId}&subjectId=${subjectId}`,
    {
      method: "GET",
    }
  );
  const data: any = await response.json();

  if (data.success) {
    return { success: true, data: data.data };
  } else {
    console.error("Error getting offer:", data.error);
    return { success: false, error: "Failed to get offer" };
  }
}

export async function saveSubjectDraft({
  userId,
  sendData,
  documentId,
}: {
  userId: string | undefined;
  documentId: string | undefined;
  sendData: {};
}) {
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  var data: any;
  if (documentId) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/saveSubject`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          userId,
          ...sendData,
          status: "draft",
        }),
      }
    );
    data = await response.json();
  } else {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/saveSubject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, ...sendData, status: "draft" }),
      }
    );
    data = await response.json();
  }

  if (data.success) {
    return { success: true, data: data.data };
  } else {
    console.error("Error save draft:", data.error);
    return { success: false, error: "Failed to save draft" };
  }
}

export async function submitSubject({
  userId,
  sendData,
  documentId,
}: {
  userId: string | undefined;
  documentId: string | undefined;
  sendData: {};
}) {
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  var data: any;
  if (documentId) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/saveSubject`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          userId,
          ...sendData,
          status: "available",
        }),
      }
    );
    data = await response.json();
  } else {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/saveSubject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, ...sendData, status: "available" }),
      }
    );
    data = await response.json();
  }

  // delay kasi gusto ko?
  setTimeout(() => {}, 1000);
  if (data.success) {
    return { success: true, data: data.data };
  } else {
    console.error("Error submitting:", data.error);
    return { success: false, error: "Failed to submit" };
  }
}

export async function resumeSubject({
  userId,
  documentId,
}: {
  userId: string | undefined;
  documentId: string;
}) {
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/saveSubject`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId,
        userId,
        status: "available",
      }),
    }
  );
  const data: any = await response.json();

  if (data.success) {
    return { success: true };
  } else {
    console.error("Error deleting:", data.error);
    return { success: false, error: "Failed to delete" };
  }
}

export async function pauseSubject({
  userId,
  documentId,
}: {
  userId: string | undefined;
  documentId: string;
}) {
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/saveSubject`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId,
        userId,
        status: "paused",
      }),
    }
  );
  const data: any = await response.json();

  if (data.success) {
    return { success: true };
  } else {
    console.error("Error deleting:", data.error);
    return { success: false, error: "Failed to delete" };
  }
}

export async function deleteSubject({
  userId,
  documentId,
}: {
  userId: string | undefined;
  documentId: string;
}) {
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/saveSubject`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId,
        userId,
      }),
    }
  );
  const data: any = await response.json();

  if (data.success) {
    return { success: true };
  } else {
    console.error("Error deleting:", data.error);
    return { success: false, error: "Failed to delete" };
  }
}
