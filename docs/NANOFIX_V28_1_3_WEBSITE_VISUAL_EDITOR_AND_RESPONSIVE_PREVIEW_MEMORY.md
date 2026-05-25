# NANOFIX V28.1.3 Website Visual Editor & Responsive Preview Memory

Canonical related documents:

- `docs/NANOFIX_V28_1_2_OA_FIXES_AND_SOLUTIONS_MEMORY.md`
- `docs/NANOFIX_V28_1_3_VIDEO_RENDERER_PROVIDER_SELECTION_MEMORY.md`
- `docs/NANOFIX_V28_1_3_GLOBAL_PUBLISH_APPROVAL_BEFORE_SCHEDULE_MEMORY.md`

---

# 1. Confirmed requirement

The official website CMS must support:

- selectable AI image/GIF editor providers;
- provider feature notes shown in the admin UI;
- same-position website preview;
- responsive Desktop / Tablet / Mobile preview modes;
- final human review before publishing.

The system must not regress back to a plain JSON-only CMS.

---

# 2. Confirmed workflow

Official website workflow:

`CMS Block`
→ `Select AI image/GIF editor provider`
→ `Generate or upload final image/GIF`
→ `Same-position preview`
→ `Desktop/Tablet/Mobile preview`
→ `Manual review`
→ `Publish`

Publishing means all approvals and checks are completed.

AI must not auto-publish website content.

---

# 3. Implemented provider registry

Implemented file:

`lib/nanofix/websiteVisualEditorProviders.ts`

Default provider:

`nanofix_internal_visual_gif_editor`

Provider order:

1. `NANOFIX Internal Website Visual/GIF Editor`
   `适合自动化官网图文和 GIF 生成`

2. `Canva Brand Template Editor`
   `适合自己编辑、品牌模板和排版优化`

3. `Adobe Firefly / Express`
   `适合高质量 AI 图片和商业安全视觉风格`

4. `Creatomate Visual/GIF API`
   `适合模板化批量图文和 GIF`

5. `Runway Image/GIF Assist`
   `适合 AI 动图创意和视觉延展`

6. `Custom Visual Webhook Editor`
   `适合自定义自动化接口或第三方封装`

7. `Manual Final Image/GIF Upload`
   `适合自己编辑好图片/GIF 后上传`

Each provider includes:

- English/Chinese labels;
- feature notes;
- worker support;
- GIF support;
- external endpoint support;
- recommendation metadata.

---

# 4. CMS database fields

Migration:

`supabase/migrations/20260526009300_v28_1_3_website_visual_editor_fields.sql`

Added to `website_content_blocks`:

- `visual_editor_provider`
- `visual_asset_type`
- `visual_editor_status`
- `visual_prompt`
- `visual_template_id`
- `visual_model`
- `visual_output_url`
- `visual_output_storage_path`
- `visual_alt_text`
- `visual_preview_json`
- `visual_cost_estimate`

Indexes:

- `website_content_blocks_visual_editor_provider_idx`
- `website_content_blocks_visual_editor_status_idx`
- `website_content_blocks_visual_asset_type_idx`

---

# 5. API behavior

API:

`app/api/admin/website-management/route.ts`

Implemented behavior:

- stores selected visual editor provider;
- stores AI prompt and visual output metadata;
- stores same-position preview JSON;
- stores publish snapshots;
- stores responsive preview metadata;
- includes `website_same_position_previews` in publish versions;
- sets:
  - `final_approval_completed_before_schedule=true`
  - `publish_ready_after_schedule=true`
  - `ai_auto_publish_allowed=false`

---

# 6. Responsive preview panel

Component:

`components/WebsiteSamePositionPreviewPanel.tsx`

Implemented preview modes:

- Desktop
- Tablet
- Mobile

Implemented simulations:

- `1440px website width simulation`
- `768px tablet simulation`
- `390px mobile simulation`

Implemented responsive behavior:

- hero layout changes;
- responsive title sizes;
- responsive padding;
- CTA stack behavior on mobile;
- card grid responsive columns;
- section responsive layout changes.

Implemented preview content:

- Hero
- Section
- Card Grid
- CTA
- visual image/GIF preview
- provider note display
- preview-before-publish display

---

# 7. Website Management UI

Component:

`components/WebsiteManagementWorkspace.tsx`

Implemented features:

- provider dropdown selector;
- provider feature note display;
- visual prompt editor;
- visual output URL fields;
- preview JSON editor;
- same-position preview panel;
- responsive Desktop/Tablet/Mobile preview switching.

---

# 8. Verification

Verification script:

`tools/verify-website-visual-editor-preview.mjs`

Checks:

- provider registry;
- provider notes;
- CMS migration fields;
- API support;
- publish snapshot support;
- UI selector support;
- same-position preview support;
- responsive Desktop/Tablet/Mobile preview support.

---

# 9. Must not regress

Future development must not:

- remove provider selection;
- remove provider feature notes;
- remove same-position preview;
- remove Desktop/Tablet/Mobile preview switching;
- remove publish snapshot metadata;
- allow AI auto-publish;
- reduce the CMS back to JSON-only editing;
- remove visual editor verification scripts.

---

# 10. Future planned upgrades

Future planned upgrades include:

- real iframe preview;
- live public website preview;
- animation/GIF timeline editor;
- AI layout validation;
- mobile overflow detection;
- SEO/AEO overlay preview;
- visual heatmap preview;
- website AI asset library;
- drag-and-drop visual CMS.
