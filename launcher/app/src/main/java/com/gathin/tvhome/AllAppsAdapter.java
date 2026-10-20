package com.gathin.tvhome;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.List;

public class AllAppsAdapter extends RecyclerView.Adapter<AllAppsAdapter.Holder> {

    private final Context ctx;
    private final List<AppAdapter.Entry> apps;
    private final Dialog parentDialog;

    public AllAppsAdapter(Context ctx, List<AppAdapter.Entry> apps, Dialog dialog) {
        this.ctx = ctx;
        this.apps = apps;
        this.parentDialog = dialog;
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_app, parent, false);
        return new Holder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder h, int position) {
        AppAdapter.Entry e = apps.get(position);
        h.name.setText(e.label);
        h.name.setVisibility(View.VISIBLE);
        h.name.setAlpha(1f);
        h.name.setTranslationY(0f);

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

        h.card.setOnClickListener(v -> {
            if (parentDialog != null && parentDialog.isShowing()) {
                parentDialog.dismiss();
            }
            Intent i = new Intent(Intent.ACTION_MAIN)
                    .addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER)
                    .setComponent(e.component)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            try {
                ctx.startActivity(i);
            } catch (Exception ex) {
                Toast.makeText(ctx, "Cannot open " + e.label, Toast.LENGTH_SHORT).show();
            }
        });

        h.card.setOnFocusChangeListener((view, focused) -> {
            float s = focused ? 1.10f : 1f;
            view.animate().scaleX(s).scaleY(s).setDuration(160).start();
        });
    }

    @Override
    public int getItemCount() {
        return apps.size();
    }

    static final class Holder extends RecyclerView.ViewHolder {
        final View card;
        final ImageView banner;
        final ImageView icon;
        final TextView label;
        final TextView name;

        Holder(View v) {
            super(v);
            card = v.findViewById(R.id.card);
            banner = v.findViewById(R.id.banner);
            icon = v.findViewById(R.id.icon);
            label = v.findViewById(R.id.label);
            name = v.findViewById(R.id.name);
            card.setFocusable(true);
            card.setClickable(true);
        }
    }
}
