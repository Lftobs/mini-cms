// // src/entrypoint.js
// import Alpine from 'alpinejs'

// export default () => {
//   Alpine.data('sidebar', (currentOrg) => ({
//     dropdownOpen: false,
//     isMobileMenuOpen: false,
//     selectedOrg: currentOrg,
//     handleOrgSwitch(org) {
//       this.selectedOrg = org;
//       this.dropdownOpen = false;
//       this.$dispatch('organization-changed', org);
//     },
//     toggleMobileMenu() {
//       this.isMobileMenuOpen = !this.isMobileMenuOpen;
//     },
//     init() {
//       window.addEventListener('resize', this.handleResize.bind(this));
//       this.handleResize();
//     },
//     destroy() {
//       window.removeEventListener('resize', this.handleResize);
//     },
//     handleResize() {
//       if (window.innerWidth > 768) {
//         this.isMobileMenuOpen = false;
//       }
//     }
//   }))
// }
