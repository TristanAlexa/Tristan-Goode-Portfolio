/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const sections = document.querySelectorAll('.hidden-section');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show-section');
        } else {
            entry.target.classList.remove('show-section');
        }
    });
}, {
    threshold: 0.15, // Trigger when 15% of the element is visible
});

sections.forEach(section => {
    observer.observe(section);
});
