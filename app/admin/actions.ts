"use server";

export async function createSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/createSubjectOption`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error creating subject option:", error);
    throw error;
  }
}

export async function editSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/editSubjectOption`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error creating subject option:", error);
    throw error;
  }
}

export async function deleteSubjectOption(data: any) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/editSubjectOption`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete subject option");
    }

    return response.json();
  } catch (error) {
    console.error("Error deleting subject option:", error);
    throw error;
  }
}