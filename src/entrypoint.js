import Alpine from 'alpinejs'
import { actions } from "astro:actions";

export default () => {
  Alpine.data('sidebar', (currentOrg) => ({
    dropdownOpen: false,
    isMobileMenuOpen: false,
    selectedOrg: currentOrg,
    handleOrgSwitch(org) {
      this.selectedOrg = org;
      this.dropdownOpen = false;
      this.$dispatch('organization-changed', org);
    },
    toggleMobileMenu() {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
    },
    init() {
      window.addEventListener('resize', this.handleResize.bind(this));
      this.handleResize();
    },
    destroy() {
      window.removeEventListener('resize', this.handleResize);
    },
    handleResize() {
      if (window.innerWidth > 768) {
        this.isMobileMenuOpen = false;
      }
    }
  }))

  Alpine.data("landingHandler", () => ({
		activeCard: 0,
		progress: 0,
		interval: null,
		mounted: true,
		currentUser: null,
		async init() {
			this.startProgress();
			try {
                const { data, error } = await actions.usersActions.me();
                if (!error) {
                    this.currentUser = data;
                }
            } catch (err) {
                console.error("Failed to fetch user in landingHandler:", err);
            }
		},
		startProgress() {
			this.interval = setInterval(() => {
				if (!this.mounted) return;
				this.progress += 2;
				if (this.progress >= 100) {
					this.activeCard = (this.activeCard + 1) % 3;
					this.progress = 0;
				}
			}, 100);
		},
		handleCardClick(index) {
			if (!this.mounted) return;
			this.activeCard = index;
			this.progress = 0;
		},
		getDashboardContent() {
			switch (this.activeCard) {
				case 0:
					return "Customer Subscription Status and Details";
				case 1:
					return "Analytics Dashboard - Real-time Insights";
				case 2:
					return "Data Visualization - Charts and Metrics";
				default:
					return "Customer Subscription Status and Details";
			}
		},
		scrollToSection(sectionId) {
			const element = document.getElementById(sectionId);
			if (element) {
				element.scrollIntoView({ behavior: "smooth" });
			}
		},
		handleBeforeUnload() {
			this.mounted = false;
			clearInterval(this.interval);
		},
	}));
}
