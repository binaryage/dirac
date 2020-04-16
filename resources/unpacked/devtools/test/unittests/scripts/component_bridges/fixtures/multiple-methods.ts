// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface Dog {
  name: string;
  isGoodDog: boolean;
}

class MultipleMethods extends HTMLElement {
  public update(dog: Dog) {
  }

  public otherMethod(name: string) {
  }

  private somethingElse() {
  }

  private whoCares(dogs: Dog[]) {
  }
}

customElements.define('devtools-test-component', MultipleMethods);
