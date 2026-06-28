package com.parkflow.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages = "com.parkflow", importOptions = {ImportOption.DoNotIncludeTests.class})
public class HexagonalArchitectureTest {

    @ArchTest
    public static final ArchRule domain_should_not_depend_on_infrastructure_or_application =
            noClasses()
                    .that().resideInAPackage("..domain..")
                    .should().dependOnClassesThat().resideInAnyPackage("..infrastructure..", "..application..");

    @ArchTest
    public static final ArchRule application_services_should_not_depend_on_jpa_repositories =
            noClasses()
                    .that().resideInAPackage("..application.service..")
                    .should().dependOnClassesThat().haveSimpleNameEndingWith("JpaRepository");

    @ArchTest
    public static final ArchRule controllers_should_not_depend_on_jpa_repositories =
            noClasses()
                    .that().resideInAPackage("..infrastructure.controller..")
                    .should().dependOnClassesThat().haveSimpleNameEndingWith("JpaRepository");
}
