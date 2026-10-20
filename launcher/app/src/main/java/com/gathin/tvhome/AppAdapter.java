package com.gathin.tvhome;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Outline;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Minimal Smart TV dock adapter: exactly 4 streaming apps + 1 "Apps" library folder.
 * Supports D-pad reordering on long press.
 */
public class AppAdapter extends RecyclerView.Adapter<AppAdapter.Holder> {

    interface TileListener {
        void onTileFocused(int position, View card);
        boolean onTileVerticalKey(int position, int keyCode);
    }

    public static final class Entry {
        public static final int APP = 0, HOME_SETTINGS = 1, CARD = 2, EMPTY = 3, FOLDER = 4;

        public final int kind;
        public final String label;
        public final ComponentName component;
        public final String pkg;
        public final Drawable banner;
        public final Drawable icon;
        public final String name;
        int ambient;

        Entry(String label, ComponentName component, Drawable banner, Drawable icon) {
            this(APP, label, component, banner, icon, null, 0);
        }

        Entry(int kind, String label, ComponentName component, Drawable banner, Drawable icon, String caption, int accent) {
            this.kind = kind;
            this.label = label;
            this.component = component;
            this.pkg = component != null ? component.getPackageName() : "";
            this.banner = banner;
            this.icon = icon;
            this.name = caption == null ? label : label + " \u00B7 " + caption;
            this.ambient = accent;
        }
    }

    static final float FOCUS_SCALE = 1.10f;
    /** Compact design size of a tile (dp) */
    static final float DESIGN_W_DP = 146f, DESIGN_H_DP = 82f;

    static int tileWidthPx(int innerWidthPx, int columns, float density) {
        int design = Math.round(DESIGN_W_DP * density);
        if (innerWidthPx <= 0 || columns <= 0) return design;
        int cell = innerWidthPx / columns;
        int fit = (int) ((cell - 12 * density) / FOCUS_SCALE);
        return Math.max(Math.round(80 * density), Math.min(design, fit));
    }

    static int tileHeightPx(int tileWidthPx) {
        return Math.round(tileWidthPx * DESIGN_H_DP / DESIGN_W_DP);
    }

    static int itemHeightPx(int tileHeightPx, float density) {
        return tileHeightPx + Math.round(40 * density);
    }

    private final Context ctx;
    private final TileListener listener;
    private final int dockSize;
    private List<String> favourites = new ArrayList<>();
    private final boolean fillDock;
    private int docked, emptySlots;
    private final Set<String> hidden;
    private final boolean animations;
    private final boolean advancedEffects;
    private final boolean showHomeSettings;
    private final boolean reducedMotion;
    private final List<Entry> items = new ArrayList<>();
    private final List<Entry> allAppsList = new ArrayList<>();

    private boolean isReordering = false;
    private int reorderPosition = -1;

    AppAdapter(Context ctx, TileListener listener, int dockSize, Config cfg) {
        this.ctx = ctx;
        this.listener = listener;
        this.dockSize = dockSize;
        this.fillDock = cfg.fillDock;
        this.hidden = new HashSet<>(cfg.hiddenApps);
        this.animations = cfg.animations;
        this.advancedEffects = cfg.animations && cfg.advancedEffects;
        this.showHomeSettings = cfg.showHomeSettingsShortcut;
        this.reducedMotion = cfg.reducedMotion;

        loadFavourites(cfg);
        setHasStableIds(true);
    }

    private void loadFavourites(Config cfg) {
        SharedPreferences prefs = ctx.getSharedPreferences("tvhome_prefs", Context.MODE_PRIVATE);
        String saved = prefs.getString("custom_dock_order", null);
        List<String> favList = new ArrayList<>();
        if (saved != null && !saved.trim().isEmpty()) {
            for (String p : saved.split(",")) {
                if (!p.trim().isEmpty()) favList.add(p.trim());
            }
        }
        if (favList.isEmpty()) {
            if (cfg.dockApps != null && !cfg.dockApps.isEmpty()) {
                favList.addAll(cfg.dockApps);
            } else {
                favList.add("com.netflix.ninja");
                favList.add("com.google.android.youtube.tv");
                favList.add("in.startv.hotstar");
                favList.add("com.amazon.amazonvideo.livingroom");
            }
        }
        this.favourites = favList;
    }

    public List<Entry> getAllAppsList() {
        return allAppsList;
    }

    public boolean isReordering() {
        return isReordering;
    }

    public void startReorder(int position) {
        if (position >= 0 && position < items.size() - 1) { // exclude Apps folder
            isReordering = true;
            reorderPosition = position;
            Toast.makeText(ctx, "Reorder Mode: ◄ / ► to move • OK to save", Toast.LENGTH_LONG).show();
            notifyItemChanged(position);
        }
    }

    public boolean handleReorderKey(int keyCode) {
        if (!isReordering || reorderPosition < 0) return false;
        if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
            if (reorderPosition > 0) {
                int newPos = reorderPosition - 1;
                Collections.swap(items, reorderPosition, newPos);
                if (reorderPosition < favourites.size() && newPos < favourites.size()) {
                    Collections.swap(favourites, reorderPosition, newPos);
                }
                notifyItemMoved(reorderPosition, newPos);
                reorderPosition = newPos;
            }
            return true;
        } else if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
            if (reorderPosition < items.size() - 2) { // keep Apps folder at end
                int newPos = reorderPosition + 1;
                Collections.swap(items, reorderPosition, newPos);
                if (reorderPosition < favourites.size() && newPos < favourites.size()) {
                    Collections.swap(favourites, reorderPosition, newPos);
                }
                notifyItemMoved(reorderPosition, newPos);
                reorderPosition = newPos;
            }
            return true;
        } else if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER
                || keyCode == KeyEvent.KEYCODE_BACK) {
            isReordering = false;
            reorderPosition = -1;
            saveCustomDockOrder();
            Toast.makeText(ctx, "New dock order saved!", Toast.LENGTH_SHORT).show();
            notifyDataSetChanged();
            return true;
        }
        return false;
    }

    private void saveCustomDockOrder() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size() - 1; i++) {
            if (i > 0) sb.append(",");
            sb.append(items.get(i).pkg);
        }
        ctx.getSharedPreferences("tvhome_prefs", Context.MODE_PRIVATE)
                .edit().putString("custom_dock_order", sb.toString()).apply();
    }

    void reload(List<Cards.Card> cards) {
        PackageManager pm = ctx.getPackageManager();
        Intent probe = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
        List<ResolveInfo> found = pm.queryIntentActivities(probe, 0);
        Map<String, Cards.Card> cardByPkg = new HashMap<>();
        for (Cards.Card c : cards) cardByPkg.put(c.pkg, c);

        List<Entry> fresh = new ArrayList<>();
        for (ResolveInfo ri : found) {
            if (ri.activityInfo == null) continue;
            String pkg = ri.activityInfo.packageName;
            if (pkg.equals(ctx.getPackageName()) || hidden.contains(pkg)) continue;
            ComponentName component = new ComponentName(pkg, ri.activityInfo.name);
            Cards.Card card = cardByPkg.get(pkg);
            if (card != null && !card.component.equals(component)) continue;
            Drawable banner = loadBanner(pm, ri);
            Drawable icon = ri.loadIcon(pm);
            if (card != null) {
                fresh.add(new Entry(Entry.CARD, card.label, component, banner, icon, card.caption, card.accent));
            } else {
                fresh.add(new Entry(Cards.cleanLabel(String.valueOf(ri.loadLabel(pm)), pkg), component, banner, icon));
            }
        }

        // Store all apps alphabetically for the "Apps" folder dialog
        allAppsList.clear();
        allAppsList.addAll(fresh);
        Collections.sort(allAppsList, (a, b) -> a.label.compareToIgnoreCase(b.label));

        // Assemble home screen dock (4 main apps + Apps folder)
        List<Entry> dockItems = new ArrayList<>();
        for (String favPkg : favourites) {
            for (Entry e : fresh) {
                if (e.pkg.equals(favPkg)) {
                    dockItems.add(e);
                    break;
                }
            }
        }

        // Fallback fill to 4 apps if configured apps are missing
        for (Entry e : fresh) {
            if (dockItems.size() >= 4) break;
            if (!dockItems.contains(e)) {
                dockItems.add(e);
            }
        }

        // 5th item: Apps folder
        dockItems.add(new Entry(Entry.FOLDER, "Apps", new ComponentName(ctx.getPackageName(), "all.apps.folder"),
                null, ctx.getDrawable(R.drawable.ic_apps), "Library", 0xFF6C5CE7));

        items.clear();
        items.addAll(dockItems);
        docked = items.size();
        emptySlots = 0;
        notifyDataSetChanged();
    }

    private Drawable loadBanner(PackageManager pm, ResolveInfo ri) {
        int id = ri.activityInfo.banner;
        if (id == 0) id = ri.activityInfo.applicationInfo.banner;
        if (id != 0) {
            try {
                Resources resources = pm.getResourcesForApplication(ri.activityInfo.applicationInfo);
                int density = Math.max(DisplayMetrics.DENSITY_XHIGH, ctx.getResources().getDisplayMetrics().densityDpi);
                return resources.getDrawableForDensity(id, density, null);
            } catch (PackageManager.NameNotFoundException | Resources.NotFoundException ignored) {
            }
        }
        return ri.activityInfo.loadBanner(pm);
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_app, parent, false);
        float density = parent.getResources().getDisplayMetrics().density;
        int width = parent.getWidth() > 0 ? parent.getWidth() : parent.getMeasuredWidth();
        int inner = width - parent.getPaddingLeft() - parent.getPaddingRight();
        int w = tileWidthPx(inner, dockSize, density), h = tileHeightPx(w);
        View card = v.findViewById(R.id.card);
        ViewGroup.LayoutParams cardLp = card.getLayoutParams();
        cardLp.width = w;
        cardLp.height = h;
        card.setLayoutParams(cardLp);
        View name = v.findViewById(R.id.name);
        ViewGroup.MarginLayoutParams nameLp = (ViewGroup.MarginLayoutParams) name.getLayoutParams();
        nameLp.width = w;
        nameLp.topMargin = h + Math.round(5 * density);
        name.setLayoutParams(nameLp);
        return new Holder(v, listener, animations, advancedEffects, reducedMotion);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder h, int position) {
        Entry e = items.get(position);
        h.card.setVisibility(View.VISIBLE);
        h.card.setFocusable(true);
        h.name.setText(e.label);
        h.name.setVisibility(View.INVISIBLE); // dock has clean look without labels

        boolean isMoving = isReordering && position == reorderPosition;
        if (isMoving) {
            h.card.setScaleX(1.12f);
            h.card.setScaleY(1.12f);
        } else {
            h.card.setScaleX(h.card.isFocused() && animations ? focusScale() : 1f);
            h.card.setScaleY(h.card.isFocused() && animations ? focusScale() : 1f);
        }

        if (e.kind == Entry.FOLDER) {
            h.banner.setImageDrawable(null);
            h.banner.setVisibility(View.GONE);
            h.icon.setImageDrawable(e.icon);
            h.icon.setVisibility(View.VISIBLE);
            h.label.setText(e.label);
            h.label.setVisibility(View.VISIBLE);
            h.card.setOnClickListener(v -> {
                if (ctx instanceof MainActivity) {
                    ((MainActivity) ctx).openAppsFolder();
                }
            });
            h.card.setOnLongClickListener(null);
            return;
        }

        if (e.banner != null) {
            h.banner.setImageDrawable(e.banner);
            h.banner.setVisibility(View.VISIBLE);
            h.icon.setVisibility(View.GONE);
            h.label.setVisibility(View.GONE);
        } else {
            h.banner.setImageDrawable(null);
            h.banner.setVisibility(View.GONE);
            h.icon.setImageDrawable(e.icon);
            h.icon.setVisibility(View.VISIBLE);
            h.label.setText(e.label);
            h.label.setVisibility(View.VISIBLE);
        }

        h.card.setOnClickListener(v -> launch(e));
        h.card.setOnLongClickListener(v -> {
            startReorder(h.getBindingAdapterPosition());
            return true;
        });
    }

    public void launch(Entry e) {
        if (e.kind == Entry.FOLDER) {
            if (ctx instanceof MainActivity) ((MainActivity) ctx).openAppsFolder();
            return;
        }
        if (e.kind == Entry.HOME_SETTINGS) {
            ctx.startActivity(new Intent(ctx, HomeSettingsActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return;
        }
        Intent i = new Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER)
                .setComponent(e.component)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        try {
            ctx.startActivity(i);
            if (advancedEffects && ctx instanceof Activity) {
                ((Activity) ctx).overridePendingTransition(R.anim.app_open_enter, R.anim.app_open_exit);
            }
        } catch (Exception ex) {
            Toast.makeText(ctx, "Cannot open " + e.label, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    @Override
    public long getItemId(int position) {
        if (position >= 0 && position < items.size()) {
            return items.get(position).component != null ? items.get(position).component.flattenToShortString().hashCode() : position;
        }
        return position;
    }

    String keyAt(int position) {
        return position >= 0 && position < items.size() && items.get(position).component != null
                ? items.get(position).component.flattenToShortString() : null;
    }

    int positionOf(String key) {
        if (key == null) return -1;
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).component != null && items.get(i).component.flattenToShortString().equals(key)) return i;
        }
        return -1;
    }

    int dockFilled() {
        return items.size();
    }

    int focusablePosition(int position) {
        return Math.max(0, Math.min(position, items.size() - 1));
    }

    String labelAt(int position) {
        return position >= 0 && position < items.size() ? items.get(position).label : "";
    }

    float focusScale() {
        return !animations ? 1f : advancedEffects ? 1.12f : 1.10f;
    }

    int ambientColorAt(int position) {
        if (position < 0 || position >= items.size()) return 0xFF444444;
        Entry e = items.get(position);
        if (e.ambient == 0) e.ambient = vividColor(e.banner != null ? e.banner : e.icon);
        return e.ambient;
    }

    private static int vividColor(Drawable live) {
        if (live == null) return 0xFF444444;
        Drawable d = live.getConstantState() != null ? live.getConstantState().newDrawable().mutate() : live;
        Rect saved = new Rect(d.getBounds());
        int n = 12;
        Bitmap bmp = Bitmap.createBitmap(n, n, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        d.setBounds(0, 0, n, n);
        d.draw(c);
        d.setBounds(saved);
        float[] hsv = new float[3];
        int best = 0xFF444444;
        float bestScore = -1f;
        long r = 0, g = 0, b = 0;
        for (int y = 0; y < n; y++) {
            for (int x = 0; x < n; x++) {
                int p = bmp.getPixel(x, y);
                r += Color.red(p);
                g += Color.green(p);
                b += Color.blue(p);
                Color.colorToHSV(p, hsv);
                float score = hsv[1] * Math.min(1f, hsv[2] * 1.4f);
                if (score > bestScore) {
                    bestScore = score;
                    best = p;
                }
            }
        }
        bmp.recycle();
        if (bestScore < 0.25f) {
            int avg = Color.rgb((int) (r / (n * n)), (int) (g / (n * n)), (int) (b / (n * n)));
            Color.colorToHSV(avg, hsv);
            hsv[2] = Math.max(hsv[2], 0.55f);
            return Color.HSVToColor(hsv);
        }
        Color.colorToHSV(best, hsv);
        hsv[1] = Math.min(1f, hsv[1] * 1.1f);
        hsv[2] = Math.max(0.5f, hsv[2]);
        return Color.HSVToColor(hsv);
    }

    static float cornerRadius(int tileWidthPx, float density) {
        return 16f * density * Math.min(1f, tileWidthPx / (DESIGN_W_DP * density));
    }

    static final class Holder extends RecyclerView.ViewHolder {
        final View card;
        final ImageView banner;
        final ImageView icon;
        final TextView label;
        final TextView name;
        final boolean animations;
        final boolean advancedEffects;
        final boolean reducedMotion;

        Holder(View v, TileListener listener, boolean animations, boolean advancedEffects,
               boolean reducedMotion) {
            super(v);
            card = v.findViewById(R.id.card);
            banner = v.findViewById(R.id.banner);
            icon = v.findViewById(R.id.icon);
            label = v.findViewById(R.id.label);
            name = v.findViewById(R.id.name);
            this.animations = animations;
            this.advancedEffects = advancedEffects;
            this.reducedMotion = reducedMotion;

            final float density = v.getResources().getDisplayMetrics().density;
            card.setOutlineProvider(new ViewOutlineProvider() {
                @Override
                public void getOutline(View view, Outline outline) {
                    outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), cornerRadius(view.getWidth(), density));
                }
            });
            card.setClipToOutline(true);

            card.setOnKeyListener((view, keyCode, event) -> {
                if (event.getAction() != KeyEvent.ACTION_DOWN) return false;
                if (keyCode != KeyEvent.KEYCODE_DPAD_UP && keyCode != KeyEvent.KEYCODE_DPAD_DOWN
                        && keyCode != KeyEvent.KEYCODE_DPAD_LEFT && keyCode != KeyEvent.KEYCODE_DPAD_RIGHT) return false;
                int pos = getBindingAdapterPosition();
                return listener != null && pos != RecyclerView.NO_POSITION && listener.onTileVerticalKey(pos, keyCode);
            });

            card.setOnFocusChangeListener((view, focused) -> {
                view.animate().cancel();
                banner.animate().cancel();
                name.animate().cancel();
                float scale = !animations ? 1f : advancedEffects ? 1.12f : 1.10f;
                float s = focused ? scale : 1f;
                if (!animations) {
                    view.setScaleX(1f);
                    view.setScaleY(1f);
                    view.setTranslationY(0f);
                    view.setTranslationZ(0f);
                    banner.setScaleX(1f);
                    banner.setScaleY(1f);
                    name.setAlpha(0f);
                } else if (reducedMotion) {
                    view.animate().scaleX(s).scaleY(s)
                            .translationY(focused && advancedEffects ? -4f * density : 0f)
                            .translationZ(focused && advancedEffects ? 8f * density : 0f)
                            .setDuration(focused ? 120 : 80)
                            .setInterpolator(new DecelerateInterpolator())
                            .withLayer().start();
                } else {
                    view.animate().scaleX(s).scaleY(s)
                            .translationY(focused && advancedEffects ? -4f * density : 0f)
                            .translationZ(focused && advancedEffects ? 8f * density : 0f)
                            .setDuration(advancedEffects ? (focused ? 220 : 170) : (focused ? 260 : 180))
                            .setInterpolator(new OvershootInterpolator(focused ? (advancedEffects ? 0.7f : 1.6f) : 0f))
                            .withLayer().start();
                    if (advancedEffects) {
                        banner.animate().scaleX(focused ? 1.035f : 1f).scaleY(focused ? 1.035f : 1f)
                                .setDuration(280).start();
                    }
                }
                int pos = getBindingAdapterPosition();
                if (focused && listener != null && pos != RecyclerView.NO_POSITION) {
                    listener.onTileFocused(pos, view);
                }
            });
        }
    }
}
