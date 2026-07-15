import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 8000,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        welcome_dashboard: resolve(__dirname, 'welcome_dashboard/code.html'),
        group_savings_room: resolve(__dirname, 'group_savings_room/code.html'),
        create_a_circle_wizard: resolve(__dirname, 'create_a_circle_wizard/code.html'),
        fiat_on_off_ramp: resolve(__dirname, 'fiat_on_off_ramp/code.html'),
        governance_overview: resolve(__dirname, 'governance_overview/code.html'),
        create_proposal_wizard: resolve(__dirname, 'create_proposal_wizard/code.html'),
        create_proposal_review_step: resolve(__dirname, 'create_proposal_review_step/code.html'),
        proposal_submission_success: resolve(__dirname, 'proposal_submission_success/code.html'),
        proposal_detail_view: resolve(__dirname, 'proposal_detail_view/code.html'),
        social_feed_preview: resolve(__dirname, 'social_feed_preview/code.html'),
        twitter_x_feed_preview: resolve(__dirname, 'twitter_x_feed_preview/code.html'),
        share_proposal_modal: resolve(__dirname, 'share_proposal_modal/code.html'),
      },
    },
  },
});
