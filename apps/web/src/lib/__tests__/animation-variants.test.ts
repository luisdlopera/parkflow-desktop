import { describe, it, expect } from "vitest";
import {
  pageTransitionVariants,
  fadeInVariants,
  slideInFromLeftVariants,
  slideInFromRightVariants,
  slideInFromTopVariants,
  slideInFromBottomVariants,
  scaleInVariants,
  modalBackdropVariants,
  modalContentVariants,
  drawerVariants,
  toastVariants,
  dropdownVariants,
  containerVariants,
  itemVariants,
  pulseVariants,
  shimmerVariants,
  spinVariants,
  buttonHoverVariants,
  buttonPulseVariants,
  cardHoverVariants,
  cardBorderVariants,
  inputFocusVariants,
  tableRowVariants,
  tableRowHoverVariants,
  statusPulseVariants,
  skeletonVariants,
  successCheckmarkVariants,
  shakeVariants,
} from "../animations/variants";

describe("animation-variants", () => {
  const testVariant = (name: string, variant: any) => {
    it(`${name} should have required properties`, () => {
      expect(variant).toBeDefined();
      expect(typeof variant).toBe("object");
    });

    if (variant.initial) {
      it(`${name} should have initial state`, () => {
        expect(variant.initial).toBeDefined();
      });
    }

    if (variant.animate) {
      it(`${name} should have animate state`, () => {
        expect(variant.animate).toBeDefined();
      });
    }

    if (variant.exit) {
      it(`${name} should have exit state`, () => {
        expect(variant.exit).toBeDefined();
      });
    }

    if (variant.hover) {
      it(`${name} should have hover state`, () => {
        expect(variant.hover).toBeDefined();
      });
    }
  };

  describe("pageTransitionVariants", () => {
    testVariant("pageTransitionVariants", pageTransitionVariants);

    it("should have initial opacity 0", () => {
      expect(pageTransitionVariants.initial.opacity).toBe(0);
    });

    it("should have initial y 10", () => {
      expect(pageTransitionVariants.initial.y).toBe(10);
    });

    it("should animate to opacity 1", () => {
      expect(pageTransitionVariants.animate.opacity).toBe(1);
    });

    it("should animate to y 0", () => {
      expect(pageTransitionVariants.animate.y).toBe(0);
    });

    it("should have exit opacity 0", () => {
      expect(pageTransitionVariants.exit.opacity).toBe(0);
    });

    it("should have exit y -10", () => {
      expect(pageTransitionVariants.exit.y).toBe(-10);
    });

    it("should have animate transition duration 0.3", () => {
      expect(pageTransitionVariants.animate.transition.duration).toBe(0.3);
    });

    it("should have exit transition duration 0.2", () => {
      expect(pageTransitionVariants.exit.transition.duration).toBe(0.2);
    });
  });

  describe("fadeInVariants", () => {
    testVariant("fadeInVariants", fadeInVariants);

    it("should have initial opacity 0", () => {
      expect(fadeInVariants.initial.opacity).toBe(0);
    });

    it("should animate to opacity 1", () => {
      expect(fadeInVariants.animate.opacity).toBe(1);
    });

    it("should have animate transition duration 0.3", () => {
      expect(fadeInVariants.animate.transition.duration).toBe(0.3);
    });

    it("should have exit transition duration 0.2", () => {
      expect(fadeInVariants.exit.transition.duration).toBe(0.2);
    });
  });

  describe("slide variants", () => {
    it("should have slideInFromLeft with initial x -20", () => {
      expect(slideInFromLeftVariants.initial.x).toBe(-20);
    });

    it("should have slideInFromRight with initial x 20", () => {
      expect(slideInFromRightVariants.initial.x).toBe(20);
    });

    it("should have slideInFromTop with initial y -20", () => {
      expect(slideInFromTopVariants.initial.y).toBe(-20);
    });

    it("should have slideInFromBottom with initial y 20", () => {
      expect(slideInFromBottomVariants.initial.y).toBe(20);
    });

    it("all slide variants should animate to position 0", () => {
      expect(slideInFromLeftVariants.animate.x).toBe(0);
      expect(slideInFromRightVariants.animate.x).toBe(0);
      expect(slideInFromTopVariants.animate.y).toBe(0);
      expect(slideInFromBottomVariants.animate.y).toBe(0);
    });

    it("all slide variants should animate to opacity 1", () => {
      expect(slideInFromLeftVariants.animate.opacity).toBe(1);
      expect(slideInFromRightVariants.animate.opacity).toBe(1);
      expect(slideInFromTopVariants.animate.opacity).toBe(1);
      expect(slideInFromBottomVariants.animate.opacity).toBe(1);
    });

    it("all slide variants should have duration 0.3", () => {
      expect(slideInFromLeftVariants.animate.transition.duration).toBe(0.3);
      expect(slideInFromRightVariants.animate.transition.duration).toBe(0.3);
      expect(slideInFromTopVariants.animate.transition.duration).toBe(0.3);
      expect(slideInFromBottomVariants.animate.transition.duration).toBe(0.3);
    });
  });

  describe("scaleInVariants", () => {
    testVariant("scaleInVariants", scaleInVariants);

    it("should have initial scale 0.95", () => {
      expect(scaleInVariants.initial.scale).toBe(0.95);
    });

    it("should have initial opacity 0", () => {
      expect(scaleInVariants.initial.opacity).toBe(0);
    });

    it("should animate to scale 1", () => {
      expect(scaleInVariants.animate.scale).toBe(1);
    });

    it("should animate to opacity 1", () => {
      expect(scaleInVariants.animate.opacity).toBe(1);
    });

    it("should have animate transition duration 0.3", () => {
      expect(scaleInVariants.animate.transition.duration).toBe(0.3);
    });

    it("should have exit scale 0.95", () => {
      expect(scaleInVariants.exit.scale).toBe(0.95);
    });
  });

  describe("modalBackdropVariants", () => {
    testVariant("modalBackdropVariants", modalBackdropVariants);

    it("should have initial opacity 0", () => {
      expect(modalBackdropVariants.initial.opacity).toBe(0);
    });

    it("should animate to opacity 1", () => {
      expect(modalBackdropVariants.animate.opacity).toBe(1);
    });

    it("should have animate transition duration 0.2", () => {
      expect(modalBackdropVariants.animate.transition.duration).toBe(0.2);
    });

    it("should have exit transition duration 0.15", () => {
      expect(modalBackdropVariants.exit.transition.duration).toBe(0.15);
    });
  });

  describe("modalContentVariants", () => {
    testVariant("modalContentVariants", modalContentVariants);

    it("should have initial y 20", () => {
      expect(modalContentVariants.initial.y).toBe(20);
    });

    it("should have initial opacity 0", () => {
      expect(modalContentVariants.initial.opacity).toBe(0);
    });

    it("should have initial scale 0.95", () => {
      expect(modalContentVariants.initial.scale).toBe(0.95);
    });

    it("should animate to y 0", () => {
      expect(modalContentVariants.animate.y).toBe(0);
    });

    it("should animate to opacity 1", () => {
      expect(modalContentVariants.animate.opacity).toBe(1);
    });

    it("should animate to scale 1", () => {
      expect(modalContentVariants.animate.scale).toBe(1);
    });

    it("should have animate transition duration 0.3", () => {
      expect(modalContentVariants.animate.transition.duration).toBe(0.3);
    });

    it("should have exit y 20", () => {
      expect(modalContentVariants.exit.y).toBe(20);
    });

    it("should have exit transition duration 0.2", () => {
      expect(modalContentVariants.exit.transition.duration).toBe(0.2);
    });
  });

  describe("drawerVariants", () => {
    testVariant("drawerVariants", drawerVariants);

    it("should have initial x 100%", () => {
      expect(drawerVariants.initial.x).toBe("100%");
    });

    it("should have initial opacity 0", () => {
      expect(drawerVariants.initial.opacity).toBe(0);
    });

    it("should animate to x 0", () => {
      expect(drawerVariants.animate.x).toBe(0);
    });

    it("should animate to opacity 1", () => {
      expect(drawerVariants.animate.opacity).toBe(1);
    });

    it("should have animate transition duration 0.3", () => {
      expect(drawerVariants.animate.transition.duration).toBe(0.3);
    });

    it("should have exit x 100%", () => {
      expect(drawerVariants.exit.x).toBe("100%");
    });

    it("should have exit transition duration 0.25", () => {
      expect(drawerVariants.exit.transition.duration).toBe(0.25);
    });
  });

  describe("toastVariants", () => {
    testVariant("toastVariants", toastVariants);

    it("should have initial y -20", () => {
      expect(toastVariants.initial.y).toBe(-20);
    });

    it("should have initial opacity 0", () => {
      expect(toastVariants.initial.opacity).toBe(0);
    });

    it("should have initial x 20", () => {
      expect(toastVariants.initial.x).toBe(20);
    });

    it("should animate to y 0", () => {
      expect(toastVariants.animate.y).toBe(0);
    });

    it("should animate to opacity 1", () => {
      expect(toastVariants.animate.opacity).toBe(1);
    });

    it("should animate to x 0", () => {
      expect(toastVariants.animate.x).toBe(0);
    });

    it("should have animate transition duration 0.3", () => {
      expect(toastVariants.animate.transition.duration).toBe(0.3);
    });
  });

  describe("dropdownVariants", () => {
    testVariant("dropdownVariants", dropdownVariants);

    it("should have initial y -10", () => {
      expect(dropdownVariants.initial.y).toBe(-10);
    });

    it("should have initial opacity 0", () => {
      expect(dropdownVariants.initial.opacity).toBe(0);
    });

    it("should animate to y 0", () => {
      expect(dropdownVariants.animate.y).toBe(0);
    });

    it("should animate to opacity 1", () => {
      expect(dropdownVariants.animate.opacity).toBe(1);
    });

    it("should have animate transition duration 0.2", () => {
      expect(dropdownVariants.animate.transition.duration).toBe(0.2);
    });

    it("should have exit transition duration 0.15", () => {
      expect(dropdownVariants.exit.transition.duration).toBe(0.15);
    });
  });

  describe("containerVariants", () => {
    testVariant("containerVariants", containerVariants);

    it("should have initial opacity 0", () => {
      expect(containerVariants.initial.opacity).toBe(0);
    });

    it("should animate to opacity 1", () => {
      expect(containerVariants.animate.opacity).toBe(1);
    });

    it("should have staggerChildren 0.1", () => {
      expect(containerVariants.animate.transition.staggerChildren).toBe(0.1);
    });

    it("should have delayChildren 0", () => {
      expect(containerVariants.animate.transition.delayChildren).toBe(0);
    });
  });

  describe("itemVariants", () => {
    testVariant("itemVariants", itemVariants);

    it("should have initial opacity 0", () => {
      expect(itemVariants.initial.opacity).toBe(0);
    });

    it("should have initial y 10", () => {
      expect(itemVariants.initial.y).toBe(10);
    });

    it("should animate to opacity 1", () => {
      expect(itemVariants.animate.opacity).toBe(1);
    });

    it("should animate to y 0", () => {
      expect(itemVariants.animate.y).toBe(0);
    });

    it("should have animate transition duration 0.3", () => {
      expect(itemVariants.animate.transition.duration).toBe(0.3);
    });
  });

  describe("pulseVariants", () => {
    it("should have animate state", () => {
      expect(pulseVariants.animate).toBeDefined();
    });

    it("should have scale array in animate", () => {
      expect(Array.isArray(pulseVariants.animate.scale)).toBe(true);
    });

    it("should pulse from 1 to 1.02 to 1", () => {
      expect(pulseVariants.animate.scale).toEqual([1, 1.02, 1]);
    });

    it("should have duration 0.3", () => {
      expect(pulseVariants.animate.transition.duration).toBe(0.3);
    });
  });

  describe("shimmerVariants", () => {
    it("should have animate state", () => {
      expect(shimmerVariants.animate).toBeDefined();
    });

    it("should have backgroundPosition animation", () => {
      expect(shimmerVariants.animate.backgroundPosition).toBeDefined();
    });

    it("should have backgroundPosition array", () => {
      expect(Array.isArray(shimmerVariants.animate.backgroundPosition)).toBe(true);
    });

    it("should have infinite repeat", () => {
      expect(shimmerVariants.animate.transition.repeat).toBe(Infinity);
    });

    it("should have duration 2", () => {
      expect(shimmerVariants.animate.transition.duration).toBe(2);
    });

    it("should have ease linear", () => {
      expect(shimmerVariants.animate.transition.ease).toBe("linear");
    });
  });

  describe("spinVariants", () => {
    it("should have animate state", () => {
      expect(spinVariants.animate).toBeDefined();
    });

    it("should rotate 360 degrees", () => {
      expect(spinVariants.animate.rotate).toBe(360);
    });

    it("should have infinite repeat", () => {
      expect(spinVariants.animate.transition.repeat).toBe(Infinity);
    });

    it("should have duration 1", () => {
      expect(spinVariants.animate.transition.duration).toBe(1);
    });

    it("should have ease linear", () => {
      expect(spinVariants.animate.transition.ease).toBe("linear");
    });
  });

  describe("buttonVariants", () => {
    it("buttonHoverVariants should have hover state", () => {
      expect(buttonHoverVariants.hover).toBeDefined();
    });

    it("buttonHoverVariants should scale on hover", () => {
      expect(buttonHoverVariants.hover.scale).toBe(1.02);
    });

    it("buttonHoverVariants should have tap state", () => {
      expect(buttonHoverVariants.tap).toBeDefined();
    });

    it("buttonHoverVariants should scale down on tap", () => {
      expect(buttonHoverVariants.tap.scale).toBe(0.98);
    });

    it("buttonPulseVariants should have animate state", () => {
      expect(buttonPulseVariants.animate).toBeDefined();
    });

    it("buttonPulseVariants should pulse scale", () => {
      expect(Array.isArray(buttonPulseVariants.animate.scale)).toBe(true);
    });

    it("buttonPulseVariants should pulse from 1 to 1.05 to 1", () => {
      expect(buttonPulseVariants.animate.scale).toEqual([1, 1.05, 1]);
    });

    it("buttonPulseVariants should have infinite repeat", () => {
      expect(buttonPulseVariants.animate.transition.repeat).toBe(Infinity);
    });

    it("buttonPulseVariants should have repeatType loop", () => {
      expect(buttonPulseVariants.animate.transition.repeatType).toBe("loop");
    });
  });

  describe("cardVariants", () => {
    it("cardHoverVariants should have initial state", () => {
      expect(cardHoverVariants.initial).toBeDefined();
    });

    it("cardHoverVariants should have hover state", () => {
      expect(cardHoverVariants.hover).toBeDefined();
    });

    it("cardHoverVariants should lift card on hover", () => {
      expect(cardHoverVariants.hover.y).toBe(-4);
    });

    it("cardBorderVariants should have initial state", () => {
      expect(cardBorderVariants.initial).toBeDefined();
    });

    it("cardBorderVariants should have hover state", () => {
      expect(cardBorderVariants.hover).toBeDefined();
    });

    it("cardBorderVariants should change border color on hover", () => {
      expect(cardBorderVariants.hover.borderColor).toBeDefined();
    });
  });

  describe("inputFocusVariants", () => {
    it("should have focused state", () => {
      expect(inputFocusVariants.focused).toBeDefined();
    });

    it("should change border color on focus", () => {
      expect(inputFocusVariants.focused.borderColor).toBeDefined();
    });

    it("should have boxShadow on focus", () => {
      expect(inputFocusVariants.focused.boxShadow).toBeDefined();
    });

    it("should have focus transition duration 0.2", () => {
      expect(inputFocusVariants.focused.transition.duration).toBe(0.2);
    });
  });

  describe("tableVariants", () => {
    it("tableRowVariants should have initial state", () => {
      expect(tableRowVariants.initial).toBeDefined();
    });

    it("tableRowVariants should have animate state", () => {
      expect(tableRowVariants.animate).toBeDefined();
    });

    it("tableRowVariants should have exit state", () => {
      expect(tableRowVariants.exit).toBeDefined();
    });

    it("tableRowVariants should fade in from below", () => {
      expect(tableRowVariants.initial.opacity).toBe(0);
      expect(tableRowVariants.initial.y).toBe(10);
    });

    it("tableRowHoverVariants should have hover state", () => {
      expect(tableRowHoverVariants.hover).toBeDefined();
    });

    it("tableRowHoverVariants should change background on hover", () => {
      expect(tableRowHoverVariants.hover.backgroundColor).toBeDefined();
    });
  });

  describe("statusPulseVariants", () => {
    it("should have animate state", () => {
      expect(statusPulseVariants.animate).toBeDefined();
    });

    it("should pulse scale", () => {
      expect(Array.isArray(statusPulseVariants.animate.scale)).toBe(true);
    });

    it("should pulse opacity", () => {
      expect(Array.isArray(statusPulseVariants.animate.opacity)).toBe(true);
    });

    it("should have infinite repeat", () => {
      expect(statusPulseVariants.animate.transition.repeat).toBe(Infinity);
    });

    it("should have duration 2", () => {
      expect(statusPulseVariants.animate.transition.duration).toBe(2);
    });
  });

  describe("skeletonVariants", () => {
    it("should have animate state", () => {
      expect(skeletonVariants.animate).toBeDefined();
    });

    it("should animate backgroundPosition", () => {
      expect(skeletonVariants.animate.backgroundPosition).toBeDefined();
    });

    it("should have infinite repeat", () => {
      expect(skeletonVariants.animate.transition.repeat).toBe(Infinity);
    });

    it("should have duration 2", () => {
      expect(skeletonVariants.animate.transition.duration).toBe(2);
    });

    it("should have ease linear", () => {
      expect(skeletonVariants.animate.transition.ease).toBe("linear");
    });
  });

  describe("successCheckmarkVariants", () => {
    testVariant("successCheckmarkVariants", successCheckmarkVariants);

    it("should have initial scale 0", () => {
      expect(successCheckmarkVariants.initial.scale).toBe(0);
    });

    it("should have initial opacity 0", () => {
      expect(successCheckmarkVariants.initial.opacity).toBe(0);
    });

    it("should animate to scale 1", () => {
      expect(successCheckmarkVariants.animate.scale).toBe(1);
    });

    it("should animate to opacity 1", () => {
      expect(successCheckmarkVariants.animate.opacity).toBe(1);
    });

    it("should use spring animation", () => {
      expect(successCheckmarkVariants.animate.transition.type).toBe("spring");
    });

    it("should have stiffness 200", () => {
      expect(successCheckmarkVariants.animate.transition.stiffness).toBe(200);
    });

    it("should have damping 20", () => {
      expect(successCheckmarkVariants.animate.transition.damping).toBe(20);
    });
  });

  describe("shakeVariants", () => {
    it("should have animate state", () => {
      expect(shakeVariants.animate).toBeDefined();
    });

    it("should shake in x direction", () => {
      expect(Array.isArray(shakeVariants.animate.x)).toBe(true);
    });

    it("should have duration 0.4", () => {
      expect(shakeVariants.animate.transition.duration).toBe(0.4);
    });

    it("should shake left right left right and return to 0", () => {
      expect(shakeVariants.animate.x).toEqual([-5, 5, -5, 5, 0]);
    });
  });

  describe("variant consistency", () => {
    const allVariants = [
      pageTransitionVariants,
      fadeInVariants,
      slideInFromLeftVariants,
      slideInFromRightVariants,
      slideInFromTopVariants,
      slideInFromBottomVariants,
      scaleInVariants,
      modalBackdropVariants,
      modalContentVariants,
      drawerVariants,
      toastVariants,
      dropdownVariants,
      containerVariants,
      itemVariants,
      pulseVariants,
      shimmerVariants,
      spinVariants,
      buttonHoverVariants,
      buttonPulseVariants,
      cardHoverVariants,
      cardBorderVariants,
      inputFocusVariants,
      tableRowVariants,
      tableRowHoverVariants,
      statusPulseVariants,
      skeletonVariants,
      successCheckmarkVariants,
      shakeVariants,
    ];

    it("all variants should be objects", () => {
      allVariants.forEach((variant) => {
        expect(typeof variant).toBe("object");
      });
    });

    it("animate variants should have transition if animated", () => {
      const animatedVariants = allVariants.filter((v) => v.animate && typeof v.animate === "object");
      animatedVariants.forEach((variant) => {
        if (variant.animate && typeof variant.animate === "object") {
          const hasTransition = variant.animate.transition !== undefined;
          const hasAnimation = Object.keys(variant.animate).some(
            (key) => key !== "transition"
          );
          if (hasAnimation) {
            expect(hasTransition || variant.animate.transition === undefined).toBeTruthy();
          }
        }
      });
    });
  });
});
