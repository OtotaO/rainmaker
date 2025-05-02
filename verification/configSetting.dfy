// ConfigSetting.dfy - Formal verification of the ConfigSetting component
// This file verifies the core properties of the ConfigSetting implementation

module ConfigSetting {
  // Type for representing different possible value types
  datatype Value = String(s: string) | Number(n: int) | Boolean(b: bool)
  
  // Option type for handling optional values
  datatype Option<T> = None | Some(value: T)
  
  // ConfigSetting state representation
  class ConfigSettingState {
    var key: string
    var value: Value
    var description: Option<string>
    var category: Option<string>
    var isEncrypted: bool
    var version: int
    
    // The invariant defines valid states for a configuration setting
    predicate Valid()
      reads this
    {
      // Key must not be empty and have limited length
      && key != ""
      && |key| <= 255
      // Version must be positive
      && version > 0
    }
    
    // Constructor ensures invariants are established
    constructor(k: string, v: Value, desc: Option<string>, cat: Option<string>, enc: bool, ver: int)
      requires k != "" && |k| <= 255 && ver > 0
      ensures Valid()
      ensures key == k && value == v && description == desc
      ensures category == cat && isEncrypted == enc && version == ver
    {
      key := k;
      value := v;
      description := desc;
      category := cat;
      isEncrypted := enc;
      version := ver;
    }
  }
  
  // Repository abstract model - represents the database layer
  class ConfigSettingRepository {
    // Abstract state - maps keys to settings
    ghost var contents: map<string, ConfigSettingState>
    
    // Repository invariant - all stored settings must be valid
    predicate Valid()
      reads this, contents.Values
    {
      forall k :: k in contents ==> contents[k].Valid()
    }
    
    // Create operation - models the createConfigSetting method
    method CreateConfigSetting(setting: ConfigSettingState) returns (success: bool)
      requires setting.Valid()
      requires Valid()
      modifies this
      ensures Valid()
      // If successful, the key wasn't there before and is now present
      ensures success ==> old(setting.key !in contents) && setting.key in contents && contents[setting.key] == setting
      // If unsuccessful, the key already existed and the repository is unchanged
      ensures !success ==> old(setting.key in contents) && contents == old(contents)
    {
      if setting.key in contents {
        // Setting with this key already exists - uniqueness constraint violation
        success := false;
        return;
      }
      
      // Insert the new setting
      contents := contents[setting.key := setting];
      success := true;
    }
    
    // Get operation - models the getConfigSetting method
    method GetConfigSetting(key: string) returns (result: Option<ConfigSettingState>)
      requires Valid()
      ensures Valid()
      // Result is Some if and only if the key exists
      ensures (key in contents <==> result.Some?)
      // If the key exists, the returned setting matches what's in contents
      ensures key in contents ==> result.Some? && result.value == contents[key]
      // Repository state is unchanged
      ensures contents == old(contents)
    {
      if key in contents {
        return Some(contents[key]);
      } else {
        return None;
      }
    }
  }
  
  // Service layer that coordinates validation and repository operations
  class ConfigSettingService {
    var repository: ConfigSettingRepository
    
    // Service invariant
    predicate Valid()
      reads this, repository, repository.contents.Values
    {
      repository.Valid()
    }
    
    constructor(repo: ConfigSettingRepository)
      requires repo.Valid()
      ensures Valid()
      ensures repository == repo
    {
      repository := repo;
    }
    
    // Create operation with validation
    method CreateConfigSetting(k: string, v: Value, desc: Option<string>, cat: Option<string>, enc: bool) 
      returns (result: Option<ConfigSettingState>)
      requires Valid()
      requires k != ""  // Key is required
      modifies repository
      ensures Valid()
      // Success case: result is Some and the repository contains the new setting
      ensures result.Some? ==> result.value.key == k && result.value.value == v && 
                                result.value.description == desc && result.value.category == cat &&
                                result.value.isEncrypted == enc &&
                                repository.contents[k] == result.value
      // Failure case: result is None if validation failed or key already exists
      ensures result.None? ==> (|k| > 255 || old(k in repository.contents))
      // If key was already in repository, repository is unchanged
      ensures old(k in repository.contents) ==> repository.contents == old(repository.contents)
    {
      // Validate inputs
      if |k| > 255 {
        return None; // Key too long
      }
      
      // Create setting with default version 1
      var setting := new ConfigSettingState(k, v, desc, cat, enc, 1);
      
      // Try to add to repository
      var success := repository.CreateConfigSetting(setting);
      
      if success {
        return Some(setting);
      } else {
        return None; // Key already exists
      }
    }
  }
  
  // Main verification methods to ensure key properties hold
  method {:test} TestUniqueKeyConstraint()
  {
    // Set up repository
    var repo := new ConfigSettingRepository();
    repo.contents := map[];
    
    // Set up service
    var service := new ConfigSettingService(repo);
    
    // Create a setting
    var key := "test-key";
    var value := String("test-value");
    var result1 := service.CreateConfigSetting(key, value, None, None, false);
    
    // Verify it was created
    assert result1.Some?;
    assert key in repo.contents;
    
    // Try to create another with same key
    var result2 := service.CreateConfigSetting(key, Number(42), None, None, false);
    
    // Verify it fails
    assert result2.None?;
    assert repo.contents[key].value == value; // Original value unchanged
  }
  
  method {:test} TestValidationRules()
  {
    // Set up repository
    var repo := new ConfigSettingRepository();
    repo.contents := map[];
    
    // Set up service
    var service := new ConfigSettingService(repo);
    
    // Test empty key (should fail)
    var emptyKey := "";
    var result := service.CreateConfigSetting(emptyKey, String("value"), None, None, false);
    
    // Verify validation blocks invalid input
    assert result.None?;
    assert emptyKey !in repo.contents;
    
    // Can still create valid settings afterward
    var validKey := "valid-key";
    var validResult := service.CreateConfigSetting(validKey, String("value"), None, None, false);
    assert validResult.Some?;
    assert validKey in repo.contents;
  }
}
