const RECIPE_POST =
  "https://prod-05.swedencentral.logic.azure.com:443/workflows/e19023972d7c41cf8cddd28cfbc5450f/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=SEarQRQwU6lqLkjtmyFV8WNbNnmmRbWCtMQX1Vxe-e0";

const RECIPE_GET_ALL =
  "https://prod-11.swedencentral.logic.azure.com:443/workflows/7540c3db3c2c4e1caa6dd4b2689e42c1/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=JMCNRkhIBvOcBJA4_TR0SBdr59n_a6AzX_nc6mF5FqM";

const RECIPE_GET_ONE_BY_TITLE_BASE =
  "https://prod-26.swedencentral.logic.azure.com:443/workflows/df40c0672b074894b42b5d109a4dcf99/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=OKoLDm-MfIxeucMwkc5qUcZ9QOGS88QCBkUiW1I9R8I";

const RECIPE_PUT_BASE1 =
  "https://prod-07.swedencentral.logic.azure.com/workflows/0f7a06f5b3da4fb1bbbb1a103857843b/triggers/When_an_HTTP_request_is_received/paths/invoke/rest/v1/recipes/";
const RECIPE_PUT_BASE2 =
  "?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=tq7vTFy45Hs5GGz_R3MlFuFCj8Z2HPoToUVO76aOWSk";

const RECIPE_DELETE_BASE1 =
  "https://prod-27.swedencentral.logic.azure.com/workflows/4626d0f8ef314c2e814c3e6f94b7b82b/triggers/When_an_HTTP_request_is_received/paths/invoke/recipes/";
const RECIPE_DELETE_BASE2 =
  "?api-version=2016-10-01&sv=1.0&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sig=2hzYk8EaRcRRqlK_QhtZhcIcsZQUImPw2SVumL9_nMU";

const IMAGE_POST =
  "https://prod-08.swedencentral.logic.azure.com:443/workflows/fc88bc42c82f4ab89d69009deaa934f4/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=0H87plq4VNq6r-j0BjcK3CCBd4sT16TpJ19SL2U4jiQ";

const IMAGE_GET_ALL =
  "https://prod-11.swedencentral.logic.azure.com:443/workflows/65f24d64fa02471da55cc6c76b14e32e/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=UFBVf0TEeiSqRVCl0glUzhFbhD7AEgSabrGDqaCCrUo";

const IMAGE_GET_ONE_BY_ID_BASE =
  "https://prod-17.swedencentral.logic.azure.com:443/workflows/6ef05a80652442f78613473bbf67a4df/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=zVc5a0PMceZoorZf6q7E9VGPBGIHgS9uM2iyIqT5yhE&id=";

const BLOB_ACCOUNT = "https://healthybitesstorage.blob.core.windows.net";
const IMAGE_FILE_FIELD_NAME = "File";

let currentRecipe = null;
let currentRecipeRaw = null;
let recipeCache = [];

$(document).ready(function () {
  $("#retImages").click(getImages);
  $("#subNewForm").click(uploadImage);

  $("#retRecipes").click(() => loadAllRecipes(true));
  $("#getRecipeByTitle").click(searchRecipesFromInput);

  $("#RecipeTitleQuery").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      searchRecipesFromInput();
    }
  });

  $("#postRecipe").click(postRecipeFromForm);
  $("#clearRecipeForm").click(clearRecipeForm);

  $("#logoutBtn").click(() => (window.location.href = "login.html"));
});

function setStatus(msg) {
  const el = document.getElementById("statusBox");
  if (el) el.textContent = `Status: ${msg}`;
}

function pickFirstNonEmpty(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function buildBlobUrlFromFilePath(filePath) {
  if (!filePath) return "";
  const trimmed = String(filePath).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const right = trimmed.replace(/^\/+/, "");
  return `${BLOB_ACCOUNT}/${right}`;
}

function buildBlobUrlFromFileName(fileName) {
  if (!fileName) return "";
  const safe = String(fileName).trim().replace(/^\/+/, "");
  return `${BLOB_ACCOUNT}/images/${safe}`;
}

function buildBlobUrlFromAny(doc) {
  const directUrl = pickFirstNonEmpty(
    doc.fileLocation,
    doc.FileLocation,
    doc.fileUrl,
    doc.FileUrl,
    doc.url,
    doc.Url,
    doc.blobUrl,
    doc.BlobUrl
  );
  if (directUrl && /^https?:\/\//i.test(directUrl)) return directUrl;

  const filePath = pickFirstNonEmpty(doc.filePath, doc.FilePath);
  if (filePath) return buildBlobUrlFromFilePath(filePath);

  const fileName = pickFirstNonEmpty(
    doc.fileName,
    doc.FileName,
    doc.name,
    doc.Name
  );
  if (fileName) return buildBlobUrlFromFileName(fileName);

  return "";
}

function uploadImage() {
  const userID = ($("#userID").val() || "").trim();
  const userName = ($("#userName").val() || "").trim();

  if (!userID) {
    alert("Please enter a User Id.");
    return;
  }

  if (!userName) {
    alert("Please enter a User Name.");
    return;
  }

  const fileInput = $("#UpFile")[0];
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    alert("Please choose a file first.");
    return;
  }

  const fd = new FormData();
  fd.append("userID", userID);
  fd.append("userName", userName);
  fd.append(IMAGE_FILE_FIELD_NAME, fileInput.files[0]);

  setStatus("Uploading...");

  $.ajax({
    url: IMAGE_POST,
    data: fd,
    cache: false,
    enctype: "multipart/form-data",
    contentType: false,
    processData: false,
    type: "POST",
    success: function (data) {
      console.log("Upload response:", data);
      setStatus("Upload complete ");
      alert("Upload complete.");
      $("#UpFile").val("");
      getImages();
    },
    error: function (xhr, status, err) {
      console.error("Upload failed:", status, err, xhr?.responseText);
      setStatus("Upload failed ❌");
      alert("Upload failed — see console.");
    },
  });
}

function getImages() {
  const $list = $("#ImageList");
  $list
    .addClass("media-grid")
    .html(
      '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>'
    );

  setStatus("Loading images...");

  $.ajax({
    url: IMAGE_GET_ALL,
    type: "GET",
    dataType: "json",
    success: function (data) {
      const arr = Array.isArray(data)
        ? data
        : data?.body && Array.isArray(data.body)
        ? data.body
        : [];

      if (!arr.length) {
        $list.html("<p>No images found.</p>");
        setStatus("No images found.");
        return;
      }

      const cards = arr.map((doc) => {
        const fileName = pickFirstNonEmpty(
          doc.fileName,
          doc.FileName,
          doc.name,
          doc.Name,
          "(image)"
        );

        const url = buildBlobUrlFromAny(doc);
        const visibleTitle = escapeHtml(fileName);

        const imgId = pickFirstNonEmpty(doc.id, doc.Id);
        const safeImgId = escapeHtml(imgId);

        if (!url) {
          return `
            <div class="media-card">
              <div class="media-body">
                <span class="media-title"><strong>${visibleTitle}</strong></span>
                <div class="recipe-meta" style="margin-top:6px;color:var(--danger);">
                  Could not build image URL from this document.
                </div>
                <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                  <button class="btnx btnx-outline" type="button"
                    onclick="imageEditUI('${safeImgId}', '${visibleTitle}')">Edit</button>
                  <button class="btnx btnx-outline" type="button"
                    onclick="imageDeleteUI('${safeImgId}', '${visibleTitle}')"
                    style="border-color:rgba(220,38,38,0.35);background:rgba(220,38,38,0.08);">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          `;
        }

        const safeUrl = escapeHtml(url);

        return `
          <div class="media-card">
            <div class="media-thumb">
              <a href="${safeUrl}" target="_blank" rel="noopener" style="display:block;width:100%;height:100%;">
                <img src="${safeUrl}" alt="${visibleTitle}" />
              </a>
            </div>
            <div class="media-body">
              <span class="media-title"><strong>${visibleTitle}</strong></span>
              <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btnx btnx-outline" type="button"
                  onclick="imageEditUI('${safeImgId}', '${visibleTitle}')">
                  Edit
                </button>
                <button class="btnx btnx-outline" type="button"
                  onclick="imageDeleteUI('${safeImgId}', '${visibleTitle}')"
                  style="border-color:rgba(220,38,38,0.35);background:rgba(220,38,38,0.08);">
                  Delete
                </button>
              </div>
            </div>
          </div>
        `;
      });

      $list.html(cards.join(""));
      setStatus(`Loaded ${arr.length} image(s) ✅`);
    },
    error: function (xhr, status, err) {
      console.error("Error fetching image list:", status, err, xhr?.responseText);
      $list.html(
        "<p style='color:var(--danger);'>Error loading images. Check console.</p>"
      );
      setStatus("Error loading images ❌");
    },
  });
}

window.imageEditUI = function (imageId, fileName) {
  alert(`(UI only)\nEdit Image\n\nID: ${imageId || "(no id)"}\nFile: ${fileName}`);
};

window.imageDeleteUI = function (imageId, fileName) {
  alert(
    `(UI only)\nDelete Image\n\nID: ${imageId || "(no id)"}\nFile: ${fileName}\n\n(No backend delete wired yet.)`
  );
};

function postRecipeFromForm() {
  const payload = {
    title: $("#RecipeTitle").val() || "",
    description: $("#RecipeDescription").val() || "",
    calories: $("#RecipeCalories").val()
      ? Number($("#RecipeCalories").val())
      : null,
    prepTime: $("#RecipePrepTime").val() || "",
    category: $("#RecipeCategory").val() || "",
    ingredients: splitCsv($("#RecipeIngredients").val()),
    steps: splitLines($("#RecipeSteps").val()),
    imageId: $("#RecipeImageId").val() || "",
    userName: $("#RecipeUserName").val() || "",
  };

  if (!payload.title.trim()) {
    alert("Please enter a recipe title.");
    return;
  }
  if (!payload.category) {
    alert("Please select a category (Breakfast, Lunch, or Dinner).");
    return;
  }

  $.ajax({
    url: RECIPE_POST,
    type: "POST",
    data: JSON.stringify(payload),
    contentType: "application/json",
    success: function (data) {
      console.log("Recipe created:", data);
      alert("Recipe created!");
      clearRecipeForm();
      loadAllRecipes(true);
    },
    error: function (xhr, status, err) {
      console.error("Recipe POST failed:", status, err, xhr?.responseText);
      alert("Recipe POST failed — see console.");
    },
  });
}

function clearRecipeForm() {
  $("#RecipeTitle").val("");
  $("#RecipeDescription").val("");
  $("#RecipeIngredients").val("");
  $("#RecipeSteps").val("");
  $("#RecipeCalories").val("");
  $("#RecipePrepTime").val("");
  $("#RecipeCategory").val("");
  $("#RecipeImageId").val("");
  $("#RecipeUserName").val("");
}

function loadAllRecipes(renderList) {
  const $list = $("#RecipeList");
  if (renderList) {
    $list
      .addClass("media-grid")
      .html(
        '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>'
      );
  }

  $.ajax({
    url: RECIPE_GET_ALL,
    type: "GET",
    dataType: "json",
    success: function (data) {
      const arr = Array.isArray(data)
        ? data
        : data?.body && Array.isArray(data.body)
        ? data.body
        : [];

      recipeCache = arr.map((r) => ({
        id: r.id || r.Id || r.recipeId || r.RecipeId || r.Recipe_ID || "",
        title: String(r.title || r.Title || r.TITLE || "").trim(),
      }));

      if (renderList) renderRecipeCards(recipeCache);
    },
    error: function (xhr, status, err) {
      console.error("Get all recipes failed:", status, err, xhr?.responseText);
      if (renderList)
        $("#RecipeList").html(
          "<p style='color:var(--danger);'>Error loading recipes. Check console.</p>"
        );
    },
  });
}

function renderRecipeCards(items) {
  const $list = $("#RecipeList");

  if (!items.length) {
    $list.html("<p>No recipes found.</p>");
    return;
  }

  const cards = items
    .map((r) => {
      const title = escapeHtml(r.title || "(no title)");
      const id = escapeHtml(r.id || "");
      const dataTitle = escapeHtml(String(r.title || ""));

      return `
        <div class="media-card recipe-card" role="button" tabindex="0" data-title="${dataTitle}">
          <div class="media-body">
            <div class="media-title">${title}</div>
            <div class="recipe-meta">${id ? `ID: ${id}` : ""}</div>
            <div class="recipe-meta" style="margin-top:6px;">Click to view</div>
          </div>
        </div>
      `;
    })
    .join("");

  $list.html(cards);

  $(".recipe-card").off("click").on("click", function () {
    const title = $(this).data("title");
    viewRecipeByTitle(title);
  });

  $(".recipe-card").off("keydown").on("keydown", function (e) {
    if (e.key === "Enter") {
      const title = $(this).data("title");
      viewRecipeByTitle(title);
    }
  });
}

function searchRecipesFromInput() {
  const q = ($("#RecipeTitleQuery").val() || "").trim();
  if (!q) {
    loadAllRecipes(true);
    return;
  }

  const queryLower = q.toLowerCase();
  const matches = recipeCache.filter((r) =>
    (r.title || "").toLowerCase().includes(queryLower)
  );
  renderRecipeCards(matches);

  if (matches.length === 1) viewRecipeByTitle(matches[0].title);
}

function viewRecipeByTitle(title) {
  const t = (title || "").trim();
  if (!t) return;

  $("#recipeEdit").addClass("hidden").html("");
  $("#recipeView")
    .removeClass("hidden")
    .html(
      `<div class="panel" style="max-width:920px;margin:10px auto;"><strong>Loading…</strong></div>`
    );

  const url = `${RECIPE_GET_ONE_BY_TITLE_BASE}&title=${encodeURIComponent(t)}`;

  $.ajax({
    url,
    type: "GET",
    dataType: "json",
    success: function (data) {
      const r = Array.isArray(data)
        ? data[0]
        : data?.body && Array.isArray(data.body)
        ? data.body[0]
        : data;

      currentRecipeRaw = r || null;
      const recipe = normalizeRecipe(r, t);
      currentRecipe = recipe;

      renderRecipeView(recipe, r);
      document
        .querySelector("#RecipeDetails")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    error: function (xhr, status, err) {
      console.error("Get recipe by title failed:", status, err, xhr?.responseText);
      $("#recipeView").html(
        `<p style="color:var(--danger);max-width:920px;margin:0 auto;">Error loading recipe.</p>`
      );
    },
  });
}

function renderRecipeView(r, raw) {
  const caloriesText = r.calories == null ? "n/a" : escapeHtml(r.calories);
  const allFieldsTable = buildAllFieldsTable(raw);

  $("#recipeView").html(`
    <div style="max-width:920px;margin:0 auto;">
      <div class="panel" style="margin-top:10px;">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
          <div>
            <div style="font-weight:950;font-size:1.4rem;color:var(--text);">${escapeHtml(
              r.title
            )}</div>
            <div class="recipe-meta">ID: ${escapeHtml(r.id || "(missing)")}</div>
            ${
              r.userName
                ? `<div class="recipe-meta">User Name: ${escapeHtml(r.userName)}</div>`
                : ""
            }
            ${
              r.category
                ? `<div class="recipe-meta">Category: ${escapeHtml(r.category)}</div>`
                : ""
            }
            ${
              r.prepTime
                ? `<div class="recipe-meta">Prep Time: ${escapeHtml(r.prepTime)}</div>`
                : ""
            }
            ${
              r.uploadDate
                ? `<div class="recipe-meta">Upload Date: ${escapeHtml(r.uploadDate)}</div>`
                : ""
            }
            <div class="recipe-meta">Calories: ${caloriesText}</div>
            ${
              r.imageId
                ? `<div class="recipe-meta">Image ID: ${escapeHtml(r.imageId)}</div>`
                : ""
            }
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btnx btnx-outline" type="button" onclick="openRecipeEdit()">Edit</button>
            <button class="btnx btnx-outline" type="button" onclick="confirmDeleteCurrentRecipe()"
              style="border-color:rgba(220,38,38,0.35);background:rgba(220,38,38,0.08);">
              Delete
            </button>
            <button class="btnx btnx-outline" type="button" onclick="closeRecipeDetails()">Close</button>
          </div>
        </div>

        ${
          r.imageId
            ? `<div id="recipeImageWrap" style="margin-top:14px;"><div class="recipe-meta">Loading linked image...</div></div>`
            : ""
        }

        ${
          r.description
            ? `<div style="margin-top:14px;">${escapeHtml(r.description)}</div>`
            : ""
        }

        <div style="height:16px"></div>

        <div class="grid-2">
          <div>
            <div class="label">Ingredients</div>
            ${
              r.ingredients.length
                ? `<ul style="margin:0 0 0 18px;">${r.ingredients
                    .map((i) => `<li>${escapeHtml(i)}</li>`)
                    .join("")}</ul>`
                : `<div class="recipe-meta">(none)</div>`
            }
          </div>
          <div>
            <div class="label">Steps / Instructions</div>
            ${
              r.steps.length
                ? `<ol style="margin:0 0 0 18px;">${r.steps
                    .map((s) => `<li>${escapeHtml(s)}</li>`)
                    .join("")}</ol>`
                : r.instructionsText
                ? `<div class="recipe-meta" style="white-space:pre-wrap;">${escapeHtml(
                    r.instructionsText
                  )}</div>`
                : `<div class="recipe-meta">(none)</div>`
            }
          </div>
        </div>

        <div style="height:10px"></div>
        <div class="recipe-meta">Click Edit to update this recipe.</div>

        ${allFieldsTable}
      </div>
    </div>
  `);

  if (r.imageId) {
    loadRecipeLinkedImage(r.imageId);
  }
}

function loadRecipeLinkedImage(imageId) {
  const wrap = $("#recipeImageWrap");
  if (!wrap.length) return;

  $.ajax({
    url: IMAGE_GET_ONE_BY_ID_BASE + encodeURIComponent(imageId),
    type: "GET",
    dataType: "json",
    success: function (imgDoc) {
      const doc = imgDoc?.body ? imgDoc.body : imgDoc;
      const url = buildBlobUrlFromAny(doc);

      if (!url) {
        wrap.html(
          `<div class="recipe-meta" style="color:var(--danger);">Linked image document found but URL could not be built.</div>`
        );
        return;
      }

      wrap.html(`
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="display:block;">
          <img class="recipe-detail-image"
               src="${escapeHtml(url)}"
               alt="Recipe image" />
        </a>
      `);
    },
    error: function (xhr, status, err) {
      console.error("Get one image failed:", status, err, xhr?.responseText);
      wrap.html(
        `<div class="recipe-meta" style="color:var(--danger);">Could not load linked image document.</div>`
      );
    },
  });
}

window.confirmDeleteCurrentRecipe = function () {
  if (!currentRecipe || !currentRecipe.id) {
    alert("No recipe selected (missing id).");
    return;
  }

  const title = currentRecipe.title || "(no title)";
  const id = currentRecipe.id;

  const ok = confirm(
    `Delete this recipe?\n\nTitle: ${title}\nID: ${id}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  deleteRecipeById(id);
};

function deleteRecipeById(id) {
  const safeId = String(id || "").trim();
  if (!safeId) {
    alert("Cannot delete — missing recipe id.");
    return;
  }

  const deleteUrl = `${RECIPE_DELETE_BASE1}${encodeURIComponent(
    safeId
  )}${RECIPE_DELETE_BASE2}`;

  $("#recipeView").html(
    `<div class="panel" style="max-width:920px;margin:10px auto;"><strong>Deleting…</strong></div>`
  );
  $("#recipeEdit").addClass("hidden").html("");

  $.ajax({
    url: deleteUrl,
    type: "DELETE",
    success: function (data) {
      console.log("Recipe deleted:", data);
      alert("Recipe deleted.");

      window.closeRecipeDetails();
      loadAllRecipes(true);
    },
    error: function (xhr, status, err) {
      console.error("Recipe DELETE failed:", status, err, xhr?.responseText);

      if (currentRecipe) {
        renderRecipeView(currentRecipe, currentRecipeRaw);
      }

      alert("Recipe delete failed — see console.");
    },
  });
}

window.openRecipeEdit = function () {
  if (!currentRecipe || !currentRecipe.id) return;

  $("#recipeView").addClass("hidden");

  $("#recipeEdit")
    .removeClass("hidden")
    .html(`
    <div style="max-width:920px;margin:0 auto;">
      <div class="panel" style="margin-top:10px;">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
          <div>
            <div style="font-weight:950;font-size:1.4rem;color:var(--text);">Edit Recipe</div>
            <div class="recipe-meta">ID: ${escapeHtml(currentRecipe.id)}</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btnx" type="button" onclick="saveRecipeEdits()">Save Changes</button>
            <button class="btnx btnx-outline" type="button" onclick="confirmDeleteCurrentRecipe()"
              style="border-color:rgba(220,38,38,0.35);background:rgba(220,38,38,0.08);">
              Delete
            </button>
            <button class="btnx btnx-outline" type="button" onclick="cancelRecipeEdit()">Cancel</button>
          </div>
        </div>

        <div style="height:14px"></div>

        <div class="grid-2">
          <div>
            <div class="label">Title</div>
            <input class="input" id="editTitle" type="text" />
          </div>
          <div>
            <div class="label">Description</div>
            <input class="input" id="editDescription" type="text" />
          </div>
          <div>
            <div class="label">Calories</div>
            <input class="input" id="editCalories" type="number" />
          </div>
          <div>
            <div class="label">Prep Time</div>
            <input class="input" id="editPrepTime" type="text" />
          </div>
          <div>
            <div class="label">Category</div>
            <select class="input" id="editCategory">
              <option value="">Select a category...</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
            </select>
          </div>
          <div>
            <div class="label">Linked Image Id</div>
            <input class="input" id="editImageId" type="text" />
          </div>
        </div>

        <div style="height:14px"></div>

        <div class="grid-2">
          <div>
            <div class="label">Ingredients (comma-separated)</div>
            <textarea class="input" id="editIngredients" rows="4"></textarea>
          </div>
          <div>
            <div class="label">Steps (one per line)</div>
            <textarea class="input" id="editSteps" rows="4"></textarea>
          </div>
        </div>

        <div style="height:14px"></div>

        <div class="grid-2">
          <div>
            <div class="label">User Name</div>
            <input class="input" id="editUserName" type="text" />
          </div>
          <div></div>
        </div>

        <div style="height:12px"></div>
        <div class="recipe-meta">
          Note: this edit form updates your core fields and preserves any other fields already stored in the recipe document.
        </div>
      </div>
    </div>
  `);

  $("#editTitle").val(currentRecipe.title);
  $("#editDescription").val(currentRecipe.description);
  $("#editCalories").val(currentRecipe.calories ?? "");
  $("#editPrepTime").val(currentRecipe.prepTime ?? "");
  $("#editCategory").val(currentRecipe.category ?? "");
  $("#editIngredients").val(currentRecipe.ingredients.join(", "));
  $("#editSteps").val(currentRecipe.steps.join("\n"));
  $("#editImageId").val(currentRecipe.imageId || "");
  $("#editUserName").val(currentRecipe.userName || "");
};

window.cancelRecipeEdit = function () {
  $("#recipeEdit").addClass("hidden").html("");
  $("#recipeView").removeClass("hidden");
};

window.saveRecipeEdits = function () {
  if (!currentRecipe || !currentRecipe.id) return;

  const updatedCore = {
    id: currentRecipe.id,
    title: $("#editTitle").val() || "",
    description: $("#editDescription").val() || "",
    calories: $("#editCalories").val() ? Number($("#editCalories").val()) : null,
    prepTime: $("#editPrepTime").val() || "",
    category: $("#editCategory").val() || "",
    ingredients: splitCsv($("#editIngredients").val()),
    steps: splitLines($("#editSteps").val()),
    imageId: $("#editImageId").val() || "",
    userName: $("#editUserName").val() || "",
  };

  if (!updatedCore.title.trim()) {
    alert("Title cannot be empty.");
    return;
  }
  if (!updatedCore.category) {
    alert("Please select a category (Breakfast, Lunch, or Dinner).");
    return;
  }

  const rawSafe = stripCosmosMetadata(currentRecipeRaw || {});
  const merged = mergeRecipePreserveFields(rawSafe, updatedCore);

  const putUrl = `${RECIPE_PUT_BASE1}${encodeURIComponent(
    updatedCore.id
  )}${RECIPE_PUT_BASE2}`;

  $.ajax({
    url: putUrl,
    type: "PUT",
    data: JSON.stringify(merged),
    contentType: "application/json",
    success: function (data) {
      console.log("Recipe updated:", data);
      alert("Recipe updated!");

      currentRecipeRaw = merged;
      currentRecipe = normalizeRecipe(
        merged,
        merged.title || merged.Title || "(no title)"
      );

      $("#recipeEdit").addClass("hidden").html("");
      $("#recipeView").removeClass("hidden");
      renderRecipeView(currentRecipe, currentRecipeRaw);
      loadAllRecipes(true);
    },
    error: function (xhr, status, err) {
      console.error("Recipe PUT failed:", status, err, xhr?.responseText);
      alert("Recipe update failed — see console.");
    },
  });
};

window.closeRecipeDetails = function () {
  currentRecipe = null;
  currentRecipeRaw = null;
  $("#recipeEdit").addClass("hidden").html("");
  $("#recipeView").addClass("hidden").html("");
};

function normalizeRecipe(r, fallbackTitle) {
  const safe = r || {};

  const id =
    safe.id ||
    safe.Id ||
    safe.recipeId ||
    safe.RecipeId ||
    safe.Recipe_ID ||
    "";

  const title = String(
    safe.title || safe.Title || safe.TITLE || fallbackTitle || "(no title)"
  ).trim();

  const description =
    safe.description || safe.Description || safe.DESCRIPTION || "";

  const calories = safe.calories ?? safe.Calories ?? safe.CALORIES ?? null;

  const ingredientsRaw =
    safe.ingredients ?? safe.Ingredients ?? safe.INGREDIENTS ?? "";
  const ingredients = normalizeListField(ingredientsRaw, false);

  const stepsRaw = safe.steps ?? safe.Steps ?? safe.STEPS ?? "";
  const steps = normalizeListField(stepsRaw, true);

  const instructionsText =
    safe.instructions || safe.Instructions || safe.INSTRUCTIONS || "";

  const imageId =
    safe.imageId ||
    safe.ImageId ||
    safe.imageID ||
    safe.ImageID ||
    safe.image_id ||
    safe.Image_ID ||
    safe.Image_ID_FK ||
    safe.ImageId_FK ||
    "";

  const userName = safe.userName || safe.UserName || safe.USERNAME || "";

  const category = safe.Category || safe.category || "";
  const prepTime = safe.Prep_Time || safe.prep_time || safe.prepTime || "";
  const uploadDate =
    safe.Upload_Date || safe.upload_date || safe.uploadDate || "";

  return {
    id: String(id || "").trim(),
    title,
    description: String(description || "").trim(),
    calories,
    ingredients,
    steps,
    instructionsText: String(instructionsText || "").trim(),
    imageId: String(imageId || "").trim(),
    userName: String(userName || "").trim(),
    category: String(category || "").trim(),
    prepTime: String(prepTime || "").trim(),
    uploadDate: String(uploadDate || "").trim(),
  };
}

function normalizeListField(value, isLines) {
  if (Array.isArray(value)) return value.map((x) => String(x)).filter(Boolean);

  const s = String(value ?? "").trim();
  if (!s) return [];

  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map((x) => String(x)).filter(Boolean);
    } catch {}
  }

  return isLines ? splitLines(s) : splitCsv(s);
}

function splitCsv(s) {
  if (!s) return [];
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitLines(s) {
  if (!s) return [];
  return String(s)
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAllFieldsTable(raw) {
  const doc = raw || {};
  const cleaned = stripCosmosMetadata(doc);

  delete cleaned.User_ID_FK;
  delete cleaned.user_id_fk;
  delete cleaned.userIdFk;
  delete cleaned.userID_FK;
  delete cleaned.UserIdFk;

  const keys = Object.keys(cleaned);
  if (!keys.length) return "";

  const priority = [
    "Title",
    "title",
    "id",
    "Category",
    "Prep_Time",
    "prepTime",
    "Calories",
    "Ingredients",
    "Instructions",
    "Steps",
    "imageId",
    "ImageId",
    "Upload_Date",
    "description",
    "Description",
  ];

  const keySet = new Set(keys);
  const ordered = [
    ...priority.filter((k) => keySet.has(k)),
    ...keys
      .filter((k) => !priority.includes(k))
      .sort((a, b) => a.localeCompare(b)),
  ];

  const rows = ordered
    .map((k) => {
      const v = cleaned[k];
      const pretty = formatAnyValue(v);
      return `
        <tr>
          <th>${escapeHtml(k)}</th>
          <td>${escapeHtml(pretty)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="kv-wrap">
      <div class="kv-title">All fields (raw document)</div>
      <table class="kv-table">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function formatAnyValue(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function stripCosmosMetadata(doc) {
  const out = {};
  for (const k of Object.keys(doc || {})) {
    if (
      k === "_rid" ||
      k === "_self" ||
      k === "_etag" ||
      k === "_attachments" ||
      k === "_ts"
    ) {
      continue;
    }
    out[k] = doc[k];
  }
  return out;
}

function mergeRecipePreserveFields(rawSafe, updatedCore) {
  const merged = { ...rawSafe };

  merged.id = updatedCore.id;

  if ("Title" in merged) merged.Title = updatedCore.title;
  if ("title" in merged || !("Title" in merged)) merged.title = updatedCore.title;

  if ("Description" in merged) merged.Description = updatedCore.description;
  if ("description" in merged || !("Description" in merged))
    merged.description = updatedCore.description;

  if ("Calories" in merged) merged.Calories = updatedCore.calories;
  if ("calories" in merged || !("Calories" in merged))
    merged.calories = updatedCore.calories;

  if ("Prep_Time" in merged) merged.Prep_Time = updatedCore.prepTime;
  if ("prep_time" in merged) merged.prep_time = updatedCore.prepTime;
  if (
    "prepTime" in merged ||
    (!("Prep_Time" in merged) && !("prep_time" in merged))
  )
    merged.prepTime = updatedCore.prepTime;

  if ("Category" in merged) merged.Category = updatedCore.category;
  if ("category" in merged || !("Category" in merged))
    merged.category = updatedCore.category;

  if ("Ingredients" in merged) merged.Ingredients = updatedCore.ingredients;
  if ("ingredients" in merged || !("Ingredients" in merged))
    merged.ingredients = updatedCore.ingredients;

  if ("Steps" in merged) merged.Steps = updatedCore.steps;
  if ("steps" in merged || !("Steps" in merged)) merged.steps = updatedCore.steps;

  if ("ImageId" in merged) merged.ImageId = updatedCore.imageId;
  if ("imageId" in merged || !("ImageId" in merged))
    merged.imageId = updatedCore.imageId;

  if ("UserName" in merged) merged.UserName = updatedCore.userName;
  if ("userName" in merged || !("UserName" in merged))
    merged.userName = updatedCore.userName;

  return merged;
}
